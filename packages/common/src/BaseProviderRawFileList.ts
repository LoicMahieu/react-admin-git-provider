import depd from "depd";
import pLimit from "p-limit";
import { BaseProviderAPICommitAction } from ".";
import {
  BaseProviderAPI,
  BaseProviderAPIFile,
  BaseProviderAPITreeFile,
} from "./BaseProviderAPI";
import { cacheStoreGetOrSet } from "./cache";
import { CacheProvider } from "./cacheProviders/CacheProvider";
import { DisabledCacheProvider } from "./cacheProviders/DisabledCacheProvider";
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

type ProviderRawFileList_ListParams = ListParams & {
  loadData?: boolean;
};

type ProviderRawFileList_CreateParams = CreateParams & {
  data: {
    data: {
      rawFile: File;
      src: string;
      title: string;
    };
  };
};

type ProviderRawFileList_UpdateParams = UpdateParams & {
  data: {
    path: string;
    data?: {
      rawFile?: File;
      src: string;
      title: string;
    };
  };
};

type ProviderRawFileList_Record = Record & {
  path: string;
  data?: {
    src: string;
  };
};

export interface ProviderRawFileListOptions extends ProviderOptions {
  filterFn?: FilterFn;
  cacheProvider?: CacheProvider;
}

export class BaseProviderRawFileList implements IProvider {
  private readonly api: BaseProviderAPI;
  private readonly projectId: string;
  private readonly ref: string;
  private readonly basePath: string;
  private readonly filterRecords: FilterFn;
  private readonly cacheProvider: CacheProvider;

  constructor(
    api: BaseProviderAPI,
    {
      projectId,
      ref,
      basePath,
      path,
      filterFn,
      cacheProvider,
      patchError,
    }: ProviderRawFileListOptions,
  ) {
    if (basePath) {
      deprecate("Option `basePath` is deprecated. Use `path` instead.");
    }
    this.projectId = projectId;
    this.ref = ref;
    this.basePath = path || basePath || "/";
    this.api = api;
    this.filterRecords = filterFn || defaultFilterRecords;
    this.cacheProvider = cacheProvider || new DisabledCacheProvider();
    this.patchError = patchError || this.patchError;
  }

  public async getList(params: ProviderRawFileList_ListParams = {}) {
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
      const files = params.loadData
        ? await Promise.all(
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
          )
        : tree.map(this.parseEntity);

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

  public async create(params: ProviderRawFileList_CreateParams) {
    try {
      const data = await readFileAsBase64(params.data.data.rawFile);
      if (!data) {
        throw new Error("Could not read file");
      }
      const fileName = params.data.data.rawFile.name;
      const filePath = this.getFilePath(fileName);

      await this.api.commit(this.projectId, this.ref, `Create ${filePath}`, [
        {
          action: "create",
          content: data,
          encoding: "base64",
          filePath,
        },
      ]);
      return {
        data: {
          id: fileName,
        },
      };
    } catch (err) {
      throw this.patchError(err);
    }
  }

  // TODO: check if data are equals, so skip commit
  public async update(params: ProviderRawFileList_UpdateParams) {
    try {
      const id = params.data.path;
      const filePath = this.getFilePath(params.data.path);
      const previousPath = this.getFilePath(params.id);

      const shouldMove = filePath !== previousPath;
      const content =
        params.data.data &&
        params.data.data.rawFile &&
        (await readFileAsBase64(params.data.data.rawFile));

      const message =
        content && !shouldMove
          ? `Update ${filePath}`
          : content && shouldMove
          ? `Delete ${previousPath} and create ${filePath}`
          : `Move ${previousPath} to ${filePath}`;

      let actions: BaseProviderAPICommitAction[] = [];
      if (shouldMove)
        actions.push({
          action: "move",
          filePath,
          previousPath,
        });
      if (content)
        actions.push({
          action: "update",
          content,
          encoding: "base64",
          filePath,
        });

      if (actions.length) {
        await this.api.commit(this.projectId, this.ref, message, actions);
      }

      return {
        data: {
          ...params.data,
          id,
        },
      };
    } catch (err) {
      throw this.patchError(err);
    }
  }

  public async updateMany(params: UpdateManyParams) {
    throw new Error("Not implemented");
    return {
      data: [],
    };
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

  private parseEntity = (
    file: BaseProviderAPITreeFile | BaseProviderAPIFile,
  ): ProviderRawFileList_Record => {
    if ("id" in file) {
      return {
        id: file.path.replace(this.basePath + "/", ""),
        path: file.path.replace(this.basePath + "/", ""),
      };
    } else {
      return {
        id: file.filePath.replace(this.basePath + "/", ""),
        path: file.filePath.replace(this.basePath + "/", ""),
        data: {
          src: "data:image/jpeg;base64," + file.content,
        },
      };
    }
  };
  private getFilePath = (entityId: string | number) => {
    return this.basePath + "/" + entityId;
  };
}

const readFileAsBase64 = (file: File) =>
  new Promise<string | null>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result =
        reader.result && typeof reader.result === "string"
          ? reader.result
              .split(",")
              .slice(-1)
              .join("")
          : null;
      resolve(result);
    });
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
