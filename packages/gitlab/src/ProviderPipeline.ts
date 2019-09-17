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
import Ky from "ky-universal";
import pLimit from "p-limit";
import querystring from "querystring";
import {
  getGitlabHeaders,
  getGitlabUrl,
  GitlabOptions,
} from "./GitlabProviderAPI";

interface IPipeline {
  id: number;
  sha: string;
  status: string;
}

export class ProviderPipeline implements IProvider {
  private readonly ref: string;
  private readonly url: string;
  private readonly headers: { [key: string]: string };
  private readonly cacheEnabled: boolean;

  constructor({
    gitlabOptions,
    projectId,
    ref,
    cacheEnabled,
  }: ProviderOptions & { gitlabOptions: GitlabOptions }) {
    this.headers = getGitlabHeaders(gitlabOptions);
    this.ref = ref;
    this.url =
      getGitlabUrl(gitlabOptions) +
      "/" +
      "projects/" +
      encodeURIComponent(projectId);
    this.cacheEnabled =
      typeof cacheEnabled !== "undefined" ? cacheEnabled : true;
  }

  public async getList(params: ListParams) {
    const response = Ky.get(
      this.url +
        "/pipelines?" +
        querystring.stringify({
          ref: this.ref,
        }),
      {
        headers: this.headers,
      },
    );
    const pipelineList: IPipeline[] = await response.json();

    const limit = pLimit(5);
    const pipelines = (await Promise.all(
      pipelineList.map(pipeline =>
        cacheStoreGetOrSet(
          "gitlab-pipelines",
          `${pipeline.id}`,
          () =>
            limit(
              async () => (await this.getOne({ id: `${pipeline.id}` })).data,
            ),
          (cached: { sha?: string; status?: string }) => {
            return (
              cached.sha === pipeline.sha && cached.status === pipeline.status
            );
          },
          this.cacheEnabled,
        ),
      ),
    )) as Record[];

    return {
      data: pipelines,
      total: pipelines.length,
    };
  }

  public async getOne(params: GetOneParams) {
    const response = Ky.get(this.url + "/pipelines/" + params.id, {
      headers: this.headers,
    });
    const data: Record = await response.json();
    return {
      data,
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
    const response = Ky.post(
      this.url +
        "/pipeline?" +
        querystring.stringify({
          ref: this.ref,
        }),
      {
        headers: this.headers,
      },
    );

    const pipeline = (await response.json()) as IPipeline;

    return {
      data: pipeline,
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
