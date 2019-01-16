import { Commits } from "gitlab";
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
} from "../../IProvider";

interface ICommit {
  id: string;
}

export class ProviderCommit implements IProvider {
  private readonly commits: Commits;
  private readonly projectId: string;
  private readonly ref: string;

  constructor({
    gitlabOptions,
    projectId,
    ref,
  }: ProviderOptions) {
    this.projectId = projectId;
    this.commits = new Commits(gitlabOptions || {});
    this.ref = ref;
  }

  public async getList(params: ListParams) {
    const commits = (await this.commits.all(this.projectId, {
      ref: this.ref,
    })) as ICommit[];

    return {
      data: commits,
      total: commits.length,
    };
  }

  public async getOne(params: GetOneParams) {
    const commit = (await this.commits.show(
      this.projectId,
      params.id,
    )) as ICommit;
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
