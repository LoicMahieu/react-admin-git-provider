import { Pipelines } from "gitlab";
import { createInstance as createCacheInstance } from "localforage";
import pLimit from "p-limit";
import {
  CreateParams,
  DeleteManyParams,
  DeleteParams,
  GetManyParams,
  GetManyReferenceParams,
  GetOneParams,
  ListParams,
  UpdateManyParams,
  UpdateParams,
} from "./baseProvider";
import { IProvider, Record } from "./IProvider";
import { cacheStoreGetOrSet } from "./utils";

interface IPipeline {
  id: number;
  sha: string;
}

export class ProviderPipeline implements IProvider {
  private readonly pipelines: Pipelines;
  private readonly projectId: string;
  private readonly ref: string;
  private readonly cacheStore: LocalForage;

  constructor(gitlabOptions: object, projectId: string, ref: string) {
    this.projectId = projectId;
    this.ref = ref;
    this.pipelines = new Pipelines(gitlabOptions);
    this.cacheStore = createCacheInstance({
      name: "react-admin-gitlab",
      storeName: "pipelines",
    });
  }

  public async getList(params: ListParams) {
    const pipelineList = (await this.pipelines.all(this.projectId, {
      ref: this.ref,
    })) as IPipeline[];
    const limit = pLimit(5);
    const pipelines = (await Promise.all(
      pipelineList.map(pipeline =>
        cacheStoreGetOrSet(
          this.cacheStore,
          `${pipeline.id}`,
          () => limit(() => this.pipelines.show(this.projectId, pipeline.id)),
          (cached: { sha?: string }) => {
            return cached.sha === pipeline.sha;
          },
        ),
      ),
    )) as Record[];

    return {
      data: pipelines,
      total: pipelines.length,
    };
  }

  public async getOne(params: GetOneParams) {
    return {
      data: (await this.pipelines.show(
        this.projectId,
        parseInt(params.id, 10),
      )) as Record,
    };
  }

  public async getMany(params: GetManyParams) {
    return {
      data: (await Promise.all(
        params.ids.map(async id => (await this.getOne({ id })).data),
      )) as Record[],
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
    throw new Error("Not available");
    return {
      data: {
        id: "string",
      },
    };
  }

  public async update(params: UpdateParams) {
    throw new Error("Not available");
    return {
      data: {
        id: "string",
      },
    };
  }

  public async updateMany(params: UpdateManyParams) {
    throw new Error("Not available");
    return {
      data: [
        {
          id: "string",
        },
      ],
    };
  }

  public async delete(params: DeleteParams) {
    throw new Error("Not available");
    return {
      data: {
        id: "string",
      },
    };
  }

  public async deleteMany(params: DeleteManyParams) {
    throw new Error("Not available");
    return {
      data: ["string"],
    };
  }
}
