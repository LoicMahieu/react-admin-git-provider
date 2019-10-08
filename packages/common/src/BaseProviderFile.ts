import uuid from "uuid";
import { BaseProviderAPI } from "./BaseProviderAPI";
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
      total: records.length,
    };
  }

  public async getOne(params: GetOneParams) {
    return {
      data: (await this.getList({
        filter: {
          id: params.id,
        },
      })).data[0],
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
    const data = this.createEntity(params.data);
    const { records, exists } = await this.getRecords();

    records.push(data);

    await this.updateRecords(
      exists,
      `Create new record in ${this.path}`,
      records,
    );

    return { data };
  }

  public async update(params: UpdateParams) {
    const data = this.createEntity(params.data);
    const getRecords = await this.getRecords();
    const exists = getRecords.exists;
    let records = getRecords.records;

    records = records.map(r => {
      if (r.id === params.id) {
        return data;
      } else {
        return r;
      }
    });

    await this.updateRecords(
      exists,
      `Update record #${params.id} in ${this.path}`,
      records,
    );

    return {
      data: {
        id: params.id,
        ...params.data,
      },
    };
  }

  public async updateMany(params: UpdateManyParams) {
    const data = this.createEntity(params.data);
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
        return data;
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
  }

  public async delete(params: DeleteParams) {
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
  }

  public async deleteMany(params: DeleteManyParams) {
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
  }

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

    const records = await getRecordsPromise;

    this.getRecordsPromise = undefined;

    return records;
  }

  private async getRecordsWithBranchCache() {
    const cacheKey = `tree.${this.ref}.${this.path}`;
    const cacheKeyBranchCommitId = `lastBranchCommitId.${this.ref}`;
    const lastBranchCommitId = await this.cacheProvider.get(
      cacheKeyBranchCommitId,
    );
    const branch = await this.api.branch(this.projectId, this.ref);
    const cached =
      branch &&
      lastBranchCommitId === branch.commit.id &&
      (await this.cacheProvider.get<Record[]>(cacheKey));
    const [records] = cached
      ? [cached]
      : await Promise.all([
          this.getRecords().then(v => v.records),
          branch &&
            (await this.cacheProvider.set(
              cacheKeyBranchCommitId,
              branch.commit.id,
            )),
        ]);

    if (!records) {
      return [];
    }

    if (!cached) {
      await this.cacheProvider.set(cacheKey, records);
    }

    return records;
  }

  private async getRecordsWithContentShaCache() {
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
    const [records] = cached
      ? [cached]
      : await Promise.all([
          this.getRecords().then(v => v.records),
          fileInfo &&
            (await this.cacheProvider.set(
              cacheKeyContentSha,
              fileInfo.contentSha,
            )),
        ]);

    if (!records) {
      return [];
    }

    if (!cached) {
      await this.cacheProvider.set(cacheKey, records);
    }

    return records;
  }

  private async getRecords() {
    const file = await this.api.getRawFile(this.projectId, this.ref, this.path);
    const records: Record[] = file ? this.serializer.parse(file) : [];
    return { records, exists: !!file };
  }

  private async updateRecords(
    exists: boolean,
    message: string,
    records: Record[],
  ) {
    await this.api.commit(this.projectId, this.ref, message, [
      {
        action: exists ? "update" : "create",
        content: this.serializer.stringify(records),
        filePath: this.path,
      },
    ]);
  }
}