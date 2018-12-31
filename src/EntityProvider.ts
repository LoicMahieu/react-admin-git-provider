import { Commits, Repositories, RepositoryFiles } from "gitlab";
import { filter, orderBy } from "lodash";
import { basename, extname } from "path";
import uuid from "uuid";

export interface ListParams {
  pagination: {
    page: number;
    perPage: number;
  };
  sort: {
    field: string;
    order: "ASC" | "DESC";
  };
  filter: object;
}
export interface GetOneParams {
  id: string;
}
export interface GetManyParams {
  ids: string[];
}
export interface GetManyReferenceParams extends ListParams {
  target: string;
  id: string;
}
export interface CreateParams {
  data: object;
}
export interface UpdateParams {
  id: string;
  data: object;
}
export interface UpdateManyParams {
  ids: string[];
  data: object;
}
export interface DeleteParams {
  id: string;
  previousData: object;
}
export interface DeleteManyParams {
  ids: string[];
}
export type Params =
  | ListParams
  | GetOneParams
  | GetManyParams
  | CreateParams
  | UpdateParams
  | DeleteParams
  | DeleteManyParams;

interface GetListOutput {
  data: Entity[];
  total: number;
}
export interface GetOneOutput {
  data: Entity;
}
interface CreateOutput {
  data: Entity;
}
interface UpdateOutput {
  data: Entity;
}
export interface UpdateManyOutput {
  data: Entity[];
}
interface DeleteOutput {
  data: Entity;
}
export interface DeleteManyOutput {
  data: string[];
}
export interface GetManyOutput {
  data: Entity[];
}
type GetManyReferenceOutput = GetManyOutput

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

interface Entity {
  id: string;
}

const sortEntities = (entities: Entity[], params: ListParams): Entity[] => {
  return orderBy(
    entities,
    [params.sort.field],
    [params.sort.order.toLowerCase() as "asc" | "desc"],
  );
};
const filterEntities = (entities: Entity[], params: ListParams): Entity[] => {
  console.log(params);
  return filter(entities, params.filter);
};
const paginateEntities = (entities: Entity[], params: ListParams): Entity[] => {
  const start = (params.pagination.page - 1) * params.pagination.perPage;
  return entities.slice(start, start + params.pagination.perPage);
};

export class EntityProvider {
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

  public async getList(params: ListParams): Promise<GetListOutput> {
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

  public async getOne(params: GetOneParams): Promise<GetOneOutput> {
    return {
      data: this.parseEntity((await this.repositoryFiles.show(
        this.projectId,
        this.getFilePath(params.id),
        this.ref,
      )) as File),
    };
  }

  public async getMany(params: GetManyParams): Promise<GetManyOutput> {
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

  public async getManyReference(params: GetManyReferenceParams): Promise<GetManyReferenceOutput> {
    return this.getList({
      ...params,
      filter: {
        [params.target]: params.id,
        ...params.filter
      }
    })
  }

  public async create(params: CreateParams): Promise<CreateOutput> {
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
  public async update(params: UpdateParams): Promise<UpdateOutput> {
    await this.commits.create(
      this.projectId,
      this.ref,
      "Update",
      [
        {
          action: "update",
          content: this.stringifyEntity(params.data as Entity),
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

  public async updateMany(params: UpdateManyParams): Promise<UpdateManyOutput> {
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

  public async delete(params: DeleteParams): Promise<DeleteOutput> {
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

  public async deleteMany(params: DeleteManyParams): Promise<DeleteManyOutput> {
    const actions = params.ids.map(id => ({
      action: "delete" as "delete", // TS could be weird !
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

  private createEntity = (data: object): Entity => ({
    ...data,
    id: uuid(),
  });

  private parseEntity = (file: File): Entity => {
    const content = JSON.parse(
      Buffer.from(file.content, file.encoding).toString("utf8"),
    );
    return {
      id: basename(file.filePath, extname(file.filePath)),
      ...content,
    };
  };

  private stringifyEntity = (entity: Entity) => {
    const { id, ...data } = entity;
    return JSON.stringify(data, null, 2);
  };

  private getFilePath = (entityId: string) => {
    return this.basePath + "/" + entityId + ".json";
  };
}
