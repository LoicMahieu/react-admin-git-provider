import {
  BaseProviderAPI,
  BaseProviderAPICommitAction,
  BaseProviderAPITreeFile,
} from "@react-admin-git-provider/common";
import Ky from "ky";
import querystring from "querystring";
import { getToken } from "./authProvider";

export interface GitlabOptions {
  host?: string;
  version?: string;
}

const defaultOptions: GitlabOptions = {
  host: "https://gitlab.com",
  version: "v4",
};

interface GitlabFile {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
  content: string;
}

interface GitlabCommitAction {
  action: "create" | "delete" | "move" | "update";
  file_path: string;
  content?: string;
}

interface GitlabCommitBody {
  actions: GitlabCommitAction[]
  branch: string
  commit_message: string
}

export function getGitlabUrl ({ host, version }: GitlabOptions) {
  return [
    host || defaultOptions.host,
    "api",
    version || defaultOptions.version,
  ].join("/");
}

export function getGitlabHeaders () {
  return {
    authorization: `Bearer ${getToken()}`,
  };
}

export class GitlabProviderAPI extends BaseProviderAPI {
  private readonly url: string;
  private readonly headers: { [header: string]: string };

  constructor(options: GitlabOptions) {
    super();
    this.url = getGitlabUrl(options);
    this.headers = getGitlabHeaders();
  }

  public async tree(projectId: string, ref: string, path: string) {
    let nextPage = 1;
    let result: BaseProviderAPITreeFile[] = [];

    while (nextPage) {
      const response = Ky.get(
        this.url +
          "/" +
          "projects/" +
          encodeURIComponent(projectId) +
          "/repository/tree?" +
          querystring.stringify({
            page: nextPage,
            path,
            ref,
          }),
        {
          headers: this.headers,
        },
      );
      const { headers } = await response;
      const body: BaseProviderAPITreeFile[] = await response.json();
      nextPage = parseInt(headers.get("X-Next-Page") || "", 10) || 0;
      result = [...result, ...body];
    }

    return result;
  }

  public async showFile(projectId: string, ref: string, path: string) {
    const response = await Ky.get(
      this.url +
        "/" +
        "projects/" +
        encodeURIComponent(projectId) +
        "/repository/files/" +
        encodeURIComponent(path) +
        "?" +
        querystring.stringify({
          ref,
        }),
      {
        headers: this.headers,
      },
    );
    const body: GitlabFile = await response.json();
    return {
      blobId: body.blob_id,
      content: body.content,
      encoding: body.encoding,
      filePath: body.file_path,
    };
  }

  public async commit(
    projectId: string,
    ref: string,
    message: string,
    actions: BaseProviderAPICommitAction[],
  ) {
    const commitBody: GitlabCommitBody = {
      actions: actions.map(({ action, filePath, content }) => ({
        action,
        content,
        file_path: filePath,
      })),
      branch: ref,
      commit_message: message,
    }

    await Ky.post(
      this.url +
        "/" +
        "projects/" +
        encodeURIComponent(projectId) +
        "/repository/commits",
      {
        headers: this.headers,
        json: commitBody,
      },
    );
  }
}
