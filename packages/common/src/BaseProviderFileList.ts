import { ObjectIterateeCustom, PartialShallow } from "lodash";
import orderBy from "lodash/orderBy";
import pLimit from "p-limit";
import { basename, extname } from "path";
import uuid from "uuid";
import {
  BaseProviderAPI,
  BaseProviderAPIFile,
  BaseProviderAPITreeFile,
} from "./BaseProviderAPI";
import { cacheStoreGetOrSet } from "./cache";
import { CacheProvider } from "./cacheProviders/CacheProvider";
import { DisabledCacheProvider } from "./cacheProviders/DisabledCacheProvider";
import {
  AnyEntitySerializer,
  ISerializers,
  serializers,
} from "./entitySerializers";
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
} from "./types";
import { filterItems } from "./utils";

type FilterFn = (
  collection: Record[],
  predicate: { [k: string]: any },
) => Record[];

const sortRecords = (entities: Record[], params: ListParams): Record[] => {
  if (!params.sort || !params.sort.field || !params.sort.order) {
    return entities;
  }
  return orderBy(
    entities,
    [params.sort.field],
    [params.sort.order.toLowerCase() as "asc" | "desc"],
  );
};
const defaultFilterRecords: FilterFn = (entities, filter) => {
  return filterItems(entities, filter);
};
const paginateRecords = (entities: Record[], params: ListParams): Record[] => {
  if (
    !params.pagination ||
    !params.pagination.page ||
    !params.pagination.perPage
  ) {
    return entities;
  }
  const start =
    (params.pagination.page - 1) * (params.pagination.perPage || 10);
  return entities.slice(start, start + (params.pagination.perPage || 10));
};

export interface ProviderFileListOptions extends ProviderOptions {
  serializer: keyof ISerializers;
  filterFn?: FilterFn;
  cacheProvider?: CacheProvider;
}

export class BaseProviderFileList implements IProvider {
  private readonly api: BaseProviderAPI;
  private readonly projectId: string;
  private readonly ref: string;
  private readonly basePath: string;
  private readonly serializer: AnyEntitySerializer;
  private readonly filterRecords: FilterFn;
  private readonly cacheProvider: CacheProvider;

  constructor(
    api: BaseProviderAPI,
    {
      projectId,
      ref,
      basePath,
      serializer,
      filterFn,
      cacheProvider,
    }: ProviderFileListOptions,
  ) {
    this.projectId = projectId;
    this.ref = ref;
    this.basePath = basePath || "/";
    this.api = api;
    this.serializer = new serializers[serializer || "json"]();
    this.filterRecords = filterFn || defaultFilterRecords;
    this.cacheProvider = cacheProvider || new DisabledCacheProvider();
  }

  public async getList(params: ListParams = {}) {
    const cacheKeyBranchCommitId = `lastBranchCommitId.${this.ref}`;
    const cacheKey = `tree.${this.ref}.${this.basePath}`;
    const lastBranchCommitId = await this.cacheProvider.get(
      cacheKeyBranchCommitId,
    );
    const branch = await this.api.branch(this.projectId, this.ref);
    const cached =
      branch &&
      lastBranchCommitId === branch.commit.id &&
      (await this.cacheProvider.get<BaseProviderAPITreeFile[]>(cacheKey));
    const [tree] = cached
      ? [cached]
      : await Promise.all([
          this.api.tree(this.projectId, this.ref, this.basePath),
          branch &&
            (await this.cacheProvider.set(
              cacheKeyBranchCommitId,
              branch.commit.id,
            )),
        ]);

    if (!cached) {
      this.cacheProvider.set(cacheKey, tree)
    }

    const limit = pLimit(5);
    const files = await Promise.all(
      tree.map(async treeFile =>
        cacheStoreGetOrSet(
          this.cacheProvider,
          treeFile.path,
          () =>
            limit(() =>
              this.api.showFile(this.projectId, this.ref, treeFile.path),
            ),
          (c: { blobId?: string }) => c.blobId === treeFile.id,
        ),
      ),
    );

    const sorted = sortRecords(files.map(this.parseEntity), params);
    const filtered = params.filter
      ? this.filterRecords(sorted, params.filter)
      : sorted;
    const paginated = paginateRecords(filtered, params);

    return {
      data: paginated,
      total: tree.length,
    };
  }

  public async getOne(params: GetOneParams) {
    const data = await this.api.showFile(
      this.projectId,
      this.ref,
      this.getFilePath(params.id),
    );
    return {
      data: data && this.parseEntity(data),
    };
  }

  public async getMany(params: GetManyParams) {
    const manyFiles = await Promise.all(
      params.ids.map(id =>
        this.api.showFile(this.projectId, this.ref, this.getFilePath(id)),
      ),
    );
    return {
      data: manyFiles
        .map(data => data && this.parseEntity(data))
        .filter(<T>(n?: T): n is T => Boolean(n)),
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

    await this.api.commit(this.projectId, this.ref, `Create ${filePath}`, [
      {
        action: "create",
        content: this.stringifyEntity(data),
        filePath,
      },
    ]);
    return { data };
  }

  // TODO: check if data are equals, so skip commit
  public async update(params: UpdateParams) {
    const filePath = this.getFilePath(params.id);
    const content = this.stringifyEntity(params.data as Record);
    const previousContent = this.stringifyEntity(params.previousData as Record);
    if (content !== previousContent) {
      await this.api.commit(this.projectId, this.ref, `Update ${filePath}`, [
        {
          action: "update",
          content,
          filePath: this.getFilePath(params.id),
        },
      ]);
    }
    return {
      data: {
        id: params.id,
        ...params.data,
      },
    };
  }

  public async updateMany(params: UpdateManyParams) {
    const entities = (await Promise.all(
      params.ids.map(
        async id =>
          (await this.getOne({
            id,
          })).data,
      ),
    )).filter(<T>(n?: T): n is T => Boolean(n));

    const newEntities = entities.map(entity => ({
      ...entity,
      ...params.data,
    }));

    await this.api.commit(
      this.projectId,
      this.ref,
      `Update many in ${this.basePath}`,
      newEntities.map(entity => ({
        action: "update" as "update",
        content: this.stringifyEntity(entity),
        filePath: this.getFilePath(entity.id),
      })),
    );

    return {
      data: newEntities,
    };
  }

  public async delete(params: DeleteParams) {
    const filePath = this.getFilePath(params.id);
    await this.api.commit(this.projectId, this.ref, `Delete ${filePath}`, [
      {
        action: "delete",
        filePath,
      },
    ]);
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
    await this.api.commit(
      this.projectId,
      this.ref,
      `Delete many in ${this.basePath}`,
      actions,
    );
    return { data: params.ids };
  }

  private createEntity = (data: object): Record => ({
    ...data,
    id: uuid(),
  });

  private parseEntity = (file: BaseProviderAPIFile): Record => {
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
