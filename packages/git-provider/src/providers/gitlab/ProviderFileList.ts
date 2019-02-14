import { Commits, Repositories, RepositoryFiles } from "gitlab";
import { createInstance as createCacheInstance } from "localforage";
import { orderBy } from "lodash";
import pLimit from "p-limit";
import { basename, extname } from "path";
import uuid from "uuid";
import { cacheStoreGetOrSet } from "../../cache";
import {
  AnyEntitySerializer,
  ISerializers,
  serializers,
} from "../../entitySerializers";
import {
  CreateParams,
  DeleteManyParams,
  DeleteParams,
  GetManyParams,
  GetManyReferenceParams,
  GetOneParams,
  IProvider,
  ListParams,
  ProviderOptions,
  Record,
  UpdateManyParams,
  UpdateParams,
} from "../../types";
import { filterItems } from "../../utils";
import { getToken } from "./authProvider";

interface TreeFile {
  id: string;
  mode: string;
  name: string;
  path: string;
  type: string;
}

interface File {
  blobId: string;
  content: string;
  encoding: string;
  filePath: string;
}

const sortEntities = (entities: Record[], params: ListParams): Record[] => {
  if (!params.sort || !params.sort.field || !params.sort.order) {
    return entities;
  }
  return orderBy(
    entities,
    [params.sort.field],
    [params.sort.order.toLowerCase() as "asc" | "desc"],
  );
};
const filterEntities = (entities: Record[], params: ListParams): Record[] => {
  return filterItems(entities, params.filter || {});
};
const paginateEntities = (entities: Record[], params: ListParams): Record[] => {
  if (!params.pagination || !params.pagination.page || !params.pagination.perPage) {
    return entities;
  }
  const start = (params.pagination.page - 1) * (params.pagination.perPage || 10);
  return entities.slice(start, start + (params.pagination.perPage || 10));
};

export interface ProviderFileListOptions extends ProviderOptions {
  serializer: keyof ISerializers;
}

export class ProviderFileList implements IProvider {
  private readonly repositories: Repositories;
  private readonly repositoryFiles: RepositoryFiles;
  private readonly commits: Commits;
  private readonly projectId: string;
  private readonly ref: string;
  private readonly basePath: string;
  private readonly cacheStore: LocalForage;
  private readonly serializer: AnyEntitySerializer;

  constructor({
    gitlabOptions,
    projectId,
    ref,
    basePath,
    serializer,
  }: ProviderFileListOptions) {
    this.projectId = projectId;
    this.ref = ref;
    this.basePath = basePath || "/";
    this.repositories = new Repositories({
      ...gitlabOptions,
      oauthToken: getToken(),
    });
    this.repositoryFiles = new RepositoryFiles({
      ...gitlabOptions,
      oauthToken: getToken(),
    });
    this.commits = new Commits({
      ...gitlabOptions,
      oauthToken: getToken(),
    });
    this.cacheStore = createCacheInstance({
      name: "react-admin-gitlab",
      storeName: "entities",
    });
    this.serializer = new serializers[serializer || "json"]();
  }

  public async getList(params: ListParams = {}) {
    const tree = (await this.repositories.tree(this.projectId, {
      path: this.basePath,
      ref: this.ref,
    })) as TreeFile[];
    const limit = pLimit(5);
    const files = (await Promise.all(
      tree.map(async treeFile =>
        cacheStoreGetOrSet(
          this.cacheStore,
          treeFile.path,
          () =>
            limit(() =>
              this.repositoryFiles.show(
                this.projectId,
                treeFile.path,
                this.ref,
              ),
            ),
          (cached: { blobId?: string }) => cached.blobId === treeFile.id,
        ),
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

  public async getManyReference(params: GetManyReferenceParams) {
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
    const filePath = this.getFilePath(data.id);

    await this.commits.create(
      this.projectId,
      this.ref,
      `Create ${filePath}`,
      [
        {
          action: "create",
          content: this.stringifyEntity(data),
          filePath,
        },
      ],
      {},
    );
    return { data };
  }

  // TODO: check if data are equals, so skip commit
  public async update(params: UpdateParams) {
    const filePath = this.getFilePath(params.id);
    await this.commits.create(
      this.projectId,
      this.ref,
      `Update ${filePath}`,
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
      `Update many in ${this.basePath}`,
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
    const filePath = this.getFilePath(params.id);
    await this.commits.create(
      this.projectId,
      this.ref,
      `Delete ${filePath}`,
      [
        {
          action: "delete",
          filePath,
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
      filePath: this.getFilePath(id),
    }));
    await this.commits.create(
      this.projectId,
      this.ref,
      `Delete many in ${this.basePath}`,
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
    const content = this.serializer.parse(
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
