import { Commits, Repositories, RepositoryFiles } from "gitlab";
import { filter, orderBy } from "lodash";
import { basename, extname } from "path";
import uuid from "uuid";
import {
  CreateParams,
  DeleteManyParams,
  DeleteParams,
  GetManyParams,
  GetManyReferenceParams,
  GetOneParams,
  IProvider,
  ListParams,
  Record,
  UpdateManyParams,
  UpdateParams,
} from "./IProvider";

interface TreeFile {
  id: string;
  mode: string;
  name: string;
  path: string;
  type: string;
}

interface File {
  content: string;
  encoding: string;
  filePath: string;
}

const sortEntities = (entities: Record[], params: ListParams): Record[] => {
  return orderBy(
    entities,
    [params.sort.field],
    [params.sort.order.toLowerCase() as "asc" | "desc"],
  );
};
const filterEntities = (entities: Record[], params: ListParams): Record[] => {
  console.log(params);
  return filter(entities, params.filter);
};
const paginateEntities = (entities: Record[], params: ListParams): Record[] => {
  const start = (params.pagination.page - 1) * params.pagination.perPage;
  return entities.slice(start, start + params.pagination.perPage);
};

export class ProviderEntity implements IProvider {
  private readonly repositories: Repositories;
  private readonly repositoryFiles: RepositoryFiles;
  private readonly commits: Commits;
  private readonly projectId: string;
  private readonly ref: string;
  private readonly basePath: string;

  constructor(
    gitlabOptions: object,
    projectId: string,
    ref: string,
    basePath: string,
  ) {
    this.projectId = projectId;
    this.ref = ref;
    this.basePath = basePath;
    this.repositories = new Repositories(gitlabOptions);
    this.repositoryFiles = new RepositoryFiles(gitlabOptions);
    this.commits = new Commits(gitlabOptions);
  }

  public async getList(params: ListParams) {
    const tree = (await this.repositories.tree(this.projectId, {
      path: this.basePath,
      ref: this.ref,
    })) as TreeFile[];
    const files = (await Promise.all(
      tree.map(ItreeFile =>
        this.repositoryFiles.show(this.projectId, ItreeFile.path, this.ref),
      ),
    )) as File[];

    return {
      data: paginateEntities(
        filterEntities(
          sortEntities(files.map(this.parseEntity), params),
          params,
        ),
        params,
      ),
      total: tree.length,
    };
  }

  public async getOne(params: GetOneParams) {
    return {
      data: this.parseEntity((await this.repositoryFiles.show(
        this.projectId,
        this.getFilePath(params.id),
        this.ref,
      )) as File),
    };
  }

  public async getMany(params: GetManyParams) {
    const manyFiles = (await Promise.all(
      params.ids.map(id =>
        this.repositoryFiles.show(
          this.projectId,
          this.getFilePath(id),
          this.ref,
        ),
      ),
    )) as File[];
    return {
      data: manyFiles.map(this.parseEntity),
    };
  }

  public async getManyReference(
    params: GetManyReferenceParams,
  ) {
    return this.getList({
      ...params,
      filter: {
        [params.target]: params.id,
        ...params.filter,
      },
    });
  }

  public async create(params: CreateParams) {
    const data = this.createEntity(params.data);

    await this.commits.create(
      this.projectId,
      this.ref,
      "Create",
      [
        {
          action: "create",
          content: this.stringifyEntity(data),
          filePath: this.getFilePath(data.id),
        },
      ],
      {},
    );
    return { data };
  }

  // TODO: check if data are equals, so skip commit
  public async update(params: UpdateParams) {
    await this.commits.create(
      this.projectId,
      this.ref,
      "Update",
      [
        {
          action: "update",
          content: this.stringifyEntity(params.data as Record),
          filePath: this.getFilePath(params.id),
        },
      ],
      {},
    );
    return {
      data: {
        id: params.id,
        ...params.data,
      },
    };
  }

  public async updateMany(params: UpdateManyParams) {
    const entities = await Promise.all(
      params.ids.map(
        async id =>
          (await this.getOne({
            id,
          })).data,
      ),
    );

    const newEntities = entities.map(entity => ({
      ...entity,
      ...params.data,
    }));

    await this.commits.create(
      this.projectId,
      this.ref,
      "Update many",
      newEntities.map(entity => ({
        action: "update" as "update",
        content: this.stringifyEntity(entity),
        filePath: this.getFilePath(entity.id),
      })),
      {},
    );

    return {
      data: newEntities,
    };
  }

  public async delete(params: DeleteParams) {
    await this.commits.create(
      this.projectId,
      this.ref,
      "Delete",
      [
        {
          action: "delete",
          filePath: this.getFilePath(params.id),
        },
      ],
      {},
    );
    return {
      data: {
        id: params.id,
        ...params.previousData,
      },
    };
  }

  public async deleteMany(params: DeleteManyParams) {
    const actions = params.ids.map(id => ({
      action: "delete" as "delete",
      filePath: id,
    }));
    await this.commits.create(
      this.projectId,
      this.ref,
      "Delete many",
      actions,
      {},
    );
    return { data: params.ids };
  }

  private createEntity = (data: object): Record => ({
    ...data,
    id: uuid(),
  });

  private parseEntity = (file: File): Record => {
    const content = JSON.parse(
      Buffer.from(file.content, file.encoding).toString("utf8"),
    );
    return {
      id: basename(file.filePath, extname(file.filePath)),
      ...content,
    };
  };

  private stringifyEntity = (entity: Record) => {
    const { id, ...data } = entity;
    return JSON.stringify(data, null, 2);
  };

  private getFilePath = (entityId: string | number) => {
    return this.basePath + "/" + entityId + ".json";
  };
}
