import {
  cacheStoreGetOrSet,
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
} from "@react-admin-git-provider/common";
import { Pipelines } from "gitlab";
import pLimit from "p-limit";
import { getToken } from "./authProvider";

interface IPipeline {
  id: number;
  sha: string
}

export class ProviderPipeline implements IProvider {
  private readonly pipelines: Pipelines;
  private readonly projectId: string;
  private readonly ref: string;

  constructor ({ gitlabOptions, projectId, ref }: ProviderOptions) {
    this.projectId = projectId;
    this.ref = ref;
    this.pipelines = new Pipelines({
      ...gitlabOptions,
      oauthToken: getToken(),
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
          "gitlab-pipelines",
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