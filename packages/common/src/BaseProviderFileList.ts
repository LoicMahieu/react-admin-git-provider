import { orderBy } from "lodash";
import pLimit from "p-limit";
import { basename, extname } from "path";
import uuid from "uuid";
import { BaseProviderAPI, BaseProviderAPIFile } from "./BaseProviderAPI";
import { cacheStoreGetOrSet } from "./cache";
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
const filterRecords = (entities: Record[], params: ListParams): Record[] => {
  return filterItems(entities, params.filter || {});
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
}

export class BaseProviderFileList implements IProvider {
  private readonly api: BaseProviderAPI;
  private readonly projectId: string;
  private readonly ref: string;
  private readonly basePath: string;
  private readonly serializer: AnyEntitySerializer;

  constructor(
    api: BaseProviderAPI,
    { projectId, ref, basePath, serializer }: ProviderFileListOptions,
  ) {
    this.projectId = projectId;
    this.ref = ref;
    this.basePath = basePath || "/";
    this.api = api;
    this.serializer = new serializers[serializer || "json"]();
  }

  public async getList(params: ListParams = {}) {
    const tree = await this.api.tree(this.projectId, this.ref, this.basePath);

    const limit = pLimit(5);
    const files = await Promise.all(
      tree.map(async treeFile =>
        cacheStoreGetOrSet(
          "gitlab-file-list",
          treeFile.path,
          () =>
            limit(() =>
              this.api.showFile(this.projectId, this.ref, treeFile.path),
            ),
          (cached: { blobId?: string }) => cached.blobId === treeFile.id,
        ),
      ),
    );

    return {
      data: paginateRecords(
        filterRecords(sortRecords(files.map(this.parseEntity), params), params),
        params,
      ),
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
    await this.api.commit(this.projectId, this.ref, `Update ${filePath}`, [
      {
        action: "update",
        content: this.stringifyEntity(params.data as Record),
        filePath: this.getFilePath(params.id),
      },
    ]);
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
