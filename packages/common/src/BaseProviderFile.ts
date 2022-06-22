import isEqual from "fast-deep-equal";
import uuid from "nanoid";
import { BaseProviderAPI } from "./BaseProviderAPI";
import { CacheProvider } from "./cacheProviders/CacheProvider";
import { DisabledCacheProvider } from "./cacheProviders/DisabledCacheProvider";
import {
  AnyEntitySerializer,
  ISerializers,
  serializers,
} from "./entitySerializers";
import {
  CreateOutput,
  CreateParams,
  DeleteManyOutput,
  DeleteManyParams,
  DeleteOutput,
  DeleteParams,
  GetManyParams,
  GetManyReferenceParams,
  GetOneParams,
  IProvider,
  ListParams,
  ProviderOptions,
  Record,
  UpdateManyOutput,
  UpdateManyParams,
  UpdateOutput,
  UpdateParams,
} from "./types";
import {
  defaultFilterRecords,
  FilterFn,
  paginateRecords,
  sortRecords,
} from "./utils";

export interface ProviderFileOptions extends ProviderOptions {
  serializer: keyof ISerializers;
  filterFn?: FilterFn;
  cacheProvider?: CacheProvider;
  cacheBehavior?: "branch" | "contentSha";
  transform?: (record: Record) => Record;
}

export class BaseProviderFile implements IProvider {
  private readonly api: BaseProviderAPI;
  private readonly projectId: string;
  private readonly ref: string;
  private readonly path: string;
  private readonly serializer: AnyEntitySerializer;
  private readonly filterRecords: FilterFn;
  private readonly cacheProvider: CacheProvider;
  private readonly cacheBehavior: "branch" | "contentSha";
  private getRecordsPromise?: Promise<Record[]>;
  private lockUpdate = Promise.resolve<any>(null);

  constructor(
    api: BaseProviderAPI,
    {
      projectId,
      ref,
      path,
      serializer,
      filterFn,
      cacheProvider,
      cacheBehavior,
      patchError,
      transform,
    }: ProviderFileOptions,
  ) {
    this.projectId = projectId;
    this.ref = ref;
    this.path = path || "/";
    this.api = api;
    this.serializer = new serializers[serializer || "json"]();
    this.filterRecords = filterFn || defaultFilterRecords;
    this.cacheProvider = cacheProvider || new DisabledCacheProvider();
    this.cacheBehavior = cacheBehavior || "branch";
    this.patchError = patchError || this.patchError;
    this.transform = transform || this.transform;
  }

  public async getList(params: ListParams = {}) {
    const records = await this.getCachedRecords();
    const sorted = sortRecords(records, params);
    const filtered = params.filter
      ? this.filterRecords(sorted, params.filter)
      : sorted;
    const paginated = paginateRecords(filtered, params);

    return {
      data: paginated,
      total: filtered.length,
    };
  }

  public async getOne(params: GetOneParams) {
    return {
      data: (
        await this.getList({
          filter: {
            id: params.id,
          },
        })
      ).data[0],
    };
  }

  public async getMany(params: GetManyParams) {
    const records = await this.getList();
    return {
      data: records.data.filter(r => params.ids.includes(`${r.id}`)),
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
    return this.withUpdateLock<CreateOutput>(async () => {
      const data = this.transform(this.createEntity(params.data));
      const { records, exists } = await this.getRecords();

      records.push(data);

      await this.updateRecords(
        exists,
        `Create new record in ${this.path}`,
        records,
      );

      return { data };
    });
  }

  public async update(params: UpdateParams) {
    return this.withUpdateLock<UpdateOutput>(async () => {
      const data = params.data as Record;
      const getRecords = await this.getRecords();
      const exists = getRecords.exists;
      let records = getRecords.records;
      let hasChange = false;

      records = records.map(r => {
        if (r.id === params.id) {
          hasChange = this.recordHasChanged(r, data);
          return this.transform(data);
        } else {
          return r;
        }
      });

      if (hasChange) {
        await this.updateRecords(
          exists,
          `Update record ${params.id} in ${this.path}`,
          records,
        );
      }

      return {
        data: {
          id: params.id,
          ...params.data,
        },
      };
    });
  }

  public async updateMany(params: UpdateManyParams) {
    return this.withUpdateLock<UpdateManyOutput>(async () => {
      const data = params.data as Record;
      const getRecords = await this.getRecords();
      const exists = getRecords.exists;
      let records = getRecords.records;

      const newEntities: Record[] = params.ids.map(id => {
        const record = records.find(r => r.id === id);
        return {
          ...record,
          ...params.data,
        };
      }) as any;

      records = records.map(r => {
        if (params.ids.includes(`${r.id}`)) {
          return {
            ...r,
            ... this.transform(data),
          };
        } else {
          return r;
        }
      });

      await this.updateRecords(
        exists,
        `Update many records in ${this.path}`,
        records,
      );

      return {
        data: newEntities,
      };
    });
  }

  public async delete(params: DeleteParams) {
    return this.withUpdateLock<DeleteOutput>(async () => {
      const getRecords = await this.getRecords();
      const exists = getRecords.exists;
      let records = getRecords.records;

      records = (records
        .map(r => {
          if (r.id === params.id) {
            return undefined;
          } else {
            return r;
          }
        })
        .filter(Boolean) as any) as Record[];

      await this.updateRecords(
        exists,
        `Delete record ${params.id} in ${this.path}`,
        records,
      );

      return {
        data: {
          id: params.id,
          ...params.previousData,
        },
      };
    });
  }

  public async deleteMany(params: DeleteManyParams) {
    return this.withUpdateLock<DeleteManyOutput>(async () => {
      const getRecords = await this.getRecords();
      const exists = getRecords.exists;
      let records = getRecords.records;

      records = (records
        .map(r => {
          if (params.ids.includes(`${r.id}`)) {
            return undefined;
          } else {
            return r;
          }
        })
        .filter(Boolean) as any) as Record[];

      await this.updateRecords(
        exists,
        `Delete many records in ${this.path}`,
        records,
      );

      return { data: params.ids };
    });
  }

  private patchError(err: any) {
    throw err;
  }

  private async withUpdateLock<T>(fn: () => Promise<T>): Promise<T> {
    this.lockUpdate = this.lockUpdate.then(fn);
    return this.lockUpdate;
  }

  private recordHasChanged(previous: Record, next: Record) {
    return !isEqual(previous, next);
  }

  private transform = (data: Record): Record => data;

  private createEntity = (data: object): Record => ({
    ...data,
    id: uuid(),
  });

  private async getCachedRecords() {
    if (this.getRecordsPromise) {
      return this.getRecordsPromise;
    }

    const getRecordsPromise =
      this.cacheBehavior === "branch"
        ? this.getRecordsWithBranchCache()
        : this.getRecordsWithContentShaCache();

    this.getRecordsPromise = getRecordsPromise;

    let records: Record[] = [];

    try {
      records = await getRecordsPromise;
    } finally {
      this.getRecordsPromise = undefined;
    }

    return records;
  }

  private async getRecordsWithBranchCache() {
    try {
      const cacheKey = `tree.${this.ref}.${this.path}`;
      const cacheKeyBranchCommitId = `lastBranchCommitId.${this.ref}.${this.path}`;
      const lastBranchCommitId = await this.cacheProvider.get(
        cacheKeyBranchCommitId,
      );
      const branch = await this.api.branch(this.projectId, this.ref);
      const cached =
        branch &&
        lastBranchCommitId === branch.commit.id &&
        (await this.cacheProvider.get<Record[]>(cacheKey));
      const records = cached
        ? cached
        : await Promise.all([
            this.getRecords().then(v => v.records),
            branch &&
              this.cacheProvider.set(cacheKeyBranchCommitId, branch.commit.id),
          ]).then(v => v[0]);

      if (!records) {
        return [];
      }

      if (!cached) {
        await this.cacheProvider.set(cacheKey, records);
      }

      return records;
    } catch (err) {
      throw this.patchError(err);
    }
  }

  private async getRecordsWithContentShaCache() {
    try {
      const cacheKey = `tree.${this.ref}.${this.path}`;
      const cacheKeyContentSha = `contentSha.${this.ref}.${this.path}`;
      const lastContentSha = await this.cacheProvider.get(cacheKeyContentSha);
      const fileInfo = await this.api.getFileInfo(
        this.projectId,
        this.ref,
        this.path,
      );
      const cached =
        fileInfo &&
        lastContentSha === fileInfo.contentSha &&
        (await this.cacheProvider.get<Record[]>(cacheKey));
      const records = cached
        ? cached
        : await Promise.all([
            this.getRecords().then(v => v.records),
            fileInfo &&
              this.cacheProvider.set(cacheKeyContentSha, fileInfo.contentSha),
          ]).then(v => v[0]);

      if (!records) {
        return [];
      }

      if (!cached) {
        await this.cacheProvider.set(cacheKey, records);
      }

      return records;
    } catch (err) {
      throw this.patchError(err);
    }
  }

  private async getRecords() {
    try {
      const file = await this.api.getRawFile(
        this.projectId,
        this.ref,
        this.path,
      );
      const records: Record[] = file ? this.serializer.parse(file) : [];
      return { records, exists: !!file };
    } catch (err) {
      throw this.patchError(err);
    }
  }

  private async updateRecords(
    exists: boolean,
    message: string,
    records: Record[],
  ) {
    try {
      await this.api.commit(this.projectId, this.ref, message, [
        {
          action: exists ? "update" : "create",
          content: this.serializer.stringify(records),
          filePath: this.path,
        },
      ]);
    } catch (err) {
      throw this.patchError(err);
    }
  }
}
