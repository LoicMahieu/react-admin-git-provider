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
} from "@react-admin-git-provider/common";
import Ky from "ky";
import querystring from "querystring";
import {
  getGitlabHeaders,
  getGitlabUrl,
  GitlabOptions,
} from "./GitlabProviderAPI";

interface ICommit {
  id: string;
}

export class ProviderCommit implements IProvider {
  private readonly url: string;
  private readonly ref: string;
  private readonly headers: { [key: string]: string };

  constructor({
    gitlabOptions,
    projectId,
    ref,
  }: ProviderOptions & { gitlabOptions: GitlabOptions }) {
    this.headers = getGitlabHeaders(gitlabOptions);
    this.ref = ref;
    this.url =
      getGitlabUrl(gitlabOptions) +
      "/" +
      "projects/" +
      encodeURIComponent(projectId) +
      "/repository/commits";
  }

  public async getList(params: ListParams) {
    const response = Ky.get(
      this.url +
        "?" +
        querystring.stringify({
          ref: this.ref,
        }),
      {
        headers: this.headers,
      },
    );
    const commits: ICommit[] = await response.json();
    return {
      data: commits,
      total: commits.length,
    };
  }

  public async getOne(params: GetOneParams) {
    const response = Ky.get(this.url + params.id, {
      headers: this.headers,
    });
    const commit: ICommit = await response.json();
    return {
      data: commit,
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
