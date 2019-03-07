import {
  BaseProviderAPI,
  BaseProviderAPICommitAction,
  BaseProviderAPIFile,
  BaseProviderAPITreeFile,
} from "@react-admin-git-provider/common";
import { Commits, Repositories, RepositoryFiles } from "gitlab";
import { getToken } from "./authProvider";

interface GitlabOptions {
  oauthToken?: string;
  host?: string;
}

export class GitlabProviderAPI extends BaseProviderAPI {
  private readonly repositories: Repositories;
  private readonly repositoryFiles: RepositoryFiles;
  private readonly commits: Commits;

  constructor(gitlabOptions?: GitlabOptions) {
    super();
    this.repositories = new Repositories({
      ...gitlabOptions,
      oauthToken: getToken(),
    });
    this.repositoryFiles = new RepositoryFiles({
      ...gitlabOptions,
      oauthToken: getToken(),
    });
    this.commits = new Commits({
      ...gitlabOptions,
      oauthToken: getToken(),
    });
  }

  public async tree(projectId: string, ref: string, path: string) {
    let nextPage = 1;
    let result: BaseProviderAPITreeFile[] = [];

    while (nextPage) {
      const data = (await this.repositories.tree(projectId, {
        page: nextPage,
        path,
        ref,
        showPagination: true,
      })) as {
        data: BaseProviderAPITreeFile[];
        pagination: {
          total: number;
          next: number | null;
          current: number | null;
          previous: number | null;
          perPage: number;
          totalPages: number;
        };
      };

      result = [...result, ...data.data];
      nextPage = data.pagination.next || 0;
    }

    return result;
  }

  public async showFile(projectId: string, ref: string, path: string) {
    return this.repositoryFiles.show(
      projectId,
      path,
      ref,
    ) as Promise<BaseProviderAPIFile>;
  }

  public async commit(projectId: string, ref: string, message: string, action: BaseProviderAPICommitAction[]) {
    await this.commits.create(
      projectId,
      ref,
      message,
      action,
      {},
    );
  }
}
