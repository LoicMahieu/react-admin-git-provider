import depd from "depd";
import uuid from "nanoid";
import pLimit from "p-limit";
import { basename, extname } from "path";
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
  createSerializer,
  SerializerOption,
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
import {
  defaultFilterRecords,
  FilterFn,
  paginateRecords,
  sortRecords,
} from "./utils";

const deprecate = depd("react-admin-git-provider");

export interface ProviderFileListOptions extends ProviderOptions {
  serializer: SerializerOption;
  filterFn?: FilterFn;
  cacheProvider?: CacheProvider;
  transform?: (record: Record) => Record | Promise<Record>;
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
      path,
      serializer,
      filterFn,
      cacheProvider,
      patchError,
      transform,
    }: ProviderFileListOptions,
  ) {
    if (basePath) {
      deprecate("Option `basePath` is deprecated. Use `path` instead.");
    }
    this.projectId = projectId;
    this.ref = ref;
    this.basePath = path || basePath || "/";
    this.api = api;
    this.serializer = createSerializer(serializer);
    this.filterRecords = filterFn || defaultFilterRecords;
    this.cacheProvider = cacheProvider || new DisabledCacheProvider();
    this.patchError = patchError || this.patchError;
    this.transform = transform || this.transform;
  }

  public async getList(params: ListParams = {}) {
    try {
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
      const tree = cached
        ? cached
        : await Promise.all([
            this.api.tree(this.projectId, this.ref, this.basePath),
            branch &&
              this.cacheProvider.set(cacheKeyBranchCommitId, branch.commit.id),
          ]).then(v => v[0]);

      if (!cached) {
        await this.cacheProvider.set(cacheKey, tree);
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
        total: filtered.length,
      };
    } catch (err) {
      throw this.patchError(err);
    }
  }

  public async getOne(params: GetOneParams) {
    try {
      const data = await this.api.showFile(
        this.projectId,
        this.ref,
        this.getFilePath(params.id),
      );
      return {
        data: data && this.parseEntity(data),
      };
    } catch (err) {
      throw this.patchError(err);
    }
  }

  public async getMany(params: GetManyParams) {
    try {
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
    } catch (err) {
      throw this.patchError(err);
    }
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
    try {
      const data = this.createEntity(params.data);
      const filePath = this.getFilePath(data.id);

      await this.api.commit(this.projectId, this.ref, `Create ${filePath}`, [
        {
          action: "create",
          content: this.stringifyEntity(await this.transform(data)),
          filePath,
        },
      ]);
      return { data };
    } catch (err) {
      throw this.patchError(err);
    }
  }

  // TODO: check if data are equals, so skip commit
  public async update(params: UpdateParams) {
    try {
      const filePath = this.getFilePath(params.id);
      const content = this.stringifyEntity(
        await this.transform(params.data as Record),
      );
      const previousContent = this.stringifyEntity(
        params.previousData as Record,
      );
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
    } catch (err) {
      throw this.patchError(err);
    }
  }

  public async updateMany(params: UpdateManyParams) {
    try {
      const entities = (
        await Promise.all(
          params.ids.map(
            async id =>
              (
                await this.getOne({
                  id,
                })
              ).data,
          ),
        )
      ).filter(<T>(n?: T): n is T => Boolean(n));

      const newEntities = entities.map(entity => ({
        ...entity,
        ...params.data,
      }));

      await this.api.commit(
        this.projectId,
        this.ref,
        `Update many in ${this.basePath}`,
        await Promise.all(
          newEntities.map(async entity => ({
            action: "update" as "update",
            content: this.stringifyEntity(await this.transform(entity)),
            filePath: this.getFilePath(entity.id),
          })),
        ),
      );

      return {
        data: newEntities,
      };
    } catch (err) {
      throw this.patchError(err);
    }
  }

  public async delete(params: DeleteParams) {
    try {
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
    } catch (err) {
      throw this.patchError(err);
    }
  }

  public async deleteMany(params: DeleteManyParams) {
    try {
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
    } catch (err) {
      throw this.patchError(err);
    }
  }

  private patchError(err: any) {
    throw err;
  }

  private transform = (data: Record): Record | Promise<Record> => data;

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
