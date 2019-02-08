import { Branches } from "gitlab";
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
} from "../../types";
import { getToken } from "./authProvider";

interface IBranch {
  name: string;
  commit: string;
}

export class ProviderBranch implements IProvider {
  private readonly branches: Branches;
  private readonly projectId: string;

  constructor({ gitlabOptions, projectId }: ProviderOptions) {
    this.projectId = projectId;
    this.branches = new Branches({
      ...gitlabOptions,
      oauthToken: getToken(),
    });
  }

  public async getList(params: ListParams) {
    const branchList = (await this.branches.all(this.projectId, {
      search: "",
    })) as IBranch[];
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
    const rawBranch = (await this.branches.show(
      this.projectId,
      params.id,
    )) as IBranch;
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
