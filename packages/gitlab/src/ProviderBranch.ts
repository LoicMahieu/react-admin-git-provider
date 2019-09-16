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
import Ky from "ky-universal";
import {
  getGitlabHeaders,
  getGitlabUrl,
  GitlabOptions,
} from "./GitlabProviderAPI";

interface IBranch {
  name: string;
  commit: string;
}

export class ProviderBranch implements IProvider {
  private readonly url: string;
  private readonly headers: { [key: string]: string };

  constructor({
    gitlabOptions,
    projectId,
  }: ProviderOptions & { gitlabOptions: GitlabOptions }) {
    this.headers = getGitlabHeaders(gitlabOptions);
    this.url =
      getGitlabUrl(gitlabOptions) +
      "/" +
      "projects/" +
      encodeURIComponent(projectId) +
      "/repository/branches";
  }

  public async getList(params: ListParams) {
    const response = Ky.get(this.url, {
      headers: this.headers,
    });
    const branchList: IBranch[] = await response.json();
    const branches: Record[] = branchList.map(branch => ({
      ...branch,
      id: branch.name,
    }));

    return {
      data: branches,
      total: branches.length,
    };
  }

  public async getOne(params: GetOneParams) {
    const response = Ky.get(this.url + "/" + params.id, {
      headers: this.headers,
    });
    const rawBranch: IBranch = await response.json();
    const branch: Record = {
      ...rawBranch,
      id: rawBranch.name,
    };

    return {
      data: branch,
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
