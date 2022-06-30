import {
  AbstractAuthBridge,
  BaseProviderAPI,
  BaseProviderAPIBranch,
  BaseProviderAPICommitAction,
  BaseProviderAPITreeFile,
  LocalStorageAuthBridge,
} from "@react-admin-git-provider/common";
import Ky from "ky-universal";
import { memoize } from "lodash";
import flatten from "lodash/flatten";
import querystring from "querystring";

export interface GitlabOptions {
  authBridge?: AbstractAuthBridge;
  host?: string;
  timeout?: number;
  version?: string;
  oauthToken?: string;
  isPrivateToken?: boolean;
  treePerPage?: number;
}

const defaultOptions: GitlabOptions = {
  host: "https://gitlab.com",
  timeout: 30000,
  version: "v4",
};

interface GitlabFile {
  file_name: string;
  file_path: string;
  size: number;
  encoding: "base64";
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
  actions: GitlabCommitAction[];
  branch: string;
  commit_message: string;
}

export function getGitlabUrl({ host, version }: GitlabOptions) {
  return [
    host || defaultOptions.host,
    "api",
    version || defaultOptions.version,
  ].join("/");
}

export function getGitlabHeaders({
  oauthToken,
  isPrivateToken,
  authBridge = new LocalStorageAuthBridge(),
}: GitlabOptions) {
  const value = oauthToken || authBridge.getToken() || "";
  const headerName = isPrivateToken ? "Private-Token" : "Authorization";
  const headerValue = isPrivateToken ? value : `Bearer ${value}`;
  return {
    [headerName]: headerValue,
  };
}

// Hotfix to not fetch multiple time the branch
const memoizePromiseDuringExec = (fn: (...args: any[]) => Promise<any>) => {
  const cache = new Map();
  return (...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const promise = fn(...args);
    cache.set(key, promise);

    promise
      .then(() => {
        cache.delete(key);
      })
      .catch(() => {
        cache.delete(key);
      });

    return promise;
  };
};

export class GitlabProviderAPI extends BaseProviderAPI {
  private readonly url: string;
  private readonly timeout?: number;
  private readonly treePerPage: number = 10;
  private readonly options: GitlabOptions;

  constructor(options: GitlabOptions) {
    super();
    this.options = options;
    this.url = getGitlabUrl(options);
    this.timeout = options.timeout || defaultOptions.timeout;

    this.tree = memoizePromiseDuringExec(this.tree.bind(this));
    this.showFile = memoizePromiseDuringExec(this.showFile.bind(this));
    this.getFileInfo = memoizePromiseDuringExec(this.getFileInfo.bind(this));
    this.getRawFile = memoizePromiseDuringExec(this.getRawFile.bind(this));
    this.branch = memoizePromiseDuringExec(this.branch.bind(this));
  }

  public async tree(projectId: string, ref: string, path: string) {
    const { headers, records } = await this._fetchTree(projectId, ref, path, 1);
    const totalPage = parseInt(headers.get("X-Total-Pages") || "", 10) || 0;
    const pages = totalPage > 0 ? Array(totalPage - 1).fill(0) : [];
    const nextRecords = flatten(
      await Promise.all(
        pages.map(async (z, page) => {
          const { records: r } = await this._fetchTree(
            projectId,
            ref,
            path,
            page + 2,
          );
          return r;
        }),
      ),
    );

    return [...records, ...nextRecords];
  }

  public async showFile(projectId: string, ref: string, path: string) {
    let response: Response;
    try {
      response = await Ky.get(
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
          headers: getGitlabHeaders(this.options),
          timeout: this.timeout,
        },
      );
    } catch (err) {
      console.error(err);
      return;
    }
    const body: GitlabFile = await response.json();
    return {
      blobId: body.blob_id,
      content: body.content,
      encoding: body.encoding,
      filePath: body.file_path,
    };
  }

  // Note: only works when proxying Gitlab due to missing expose headers in CORS
  public async getFileInfo(projectId: string, ref: string, path: string) {
    let response: Response;
    try {
      response = await Ky.head(
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
          headers: getGitlabHeaders(this.options),
          timeout: this.timeout,
        },
      );
    } catch (err) {
      console.error(err);
      return;
    }
    const headers = response.headers;
    return {
      blobId: headers.get("X-Gitlab-Blob-Id") + "",
      commitId: headers.get("X-Gitlab-Commit-Id") + "",
      contentSha: headers.get("X-Gitlab-Content-Sha256") + "",
      size: parseInt(headers.get("X-Gitlab-Size") || "0", 10),
    };
  }

  public async getRawFile(projectId: string, ref: string, path: string) {
    let response: Response;
    try {
      response = await Ky.get(
        this.url +
          "/" +
          "projects/" +
          encodeURIComponent(projectId) +
          "/repository/files/" +
          encodeURIComponent(path) +
          "/raw?" +
          querystring.stringify({
            ref,
          }),
        {
          headers: getGitlabHeaders(this.options),
          timeout: this.timeout,
        },
      );
    } catch (err) {
      console.error(err);
      return;
    }
    return response.text();
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
    };

    await Ky.post(
      this.url +
        "/" +
        "projects/" +
        encodeURIComponent(projectId) +
        "/repository/commits",
      {
        headers: getGitlabHeaders(this.options),
        json: commitBody,
        timeout: this.timeout,
      },
    );
  }

  public async branch(projectId: string, ref: string) {
    const response = await Ky.get(
      this.url +
        "/" +
        "projects/" +
        encodeURIComponent(projectId) +
        "/repository/branches/" +
        encodeURIComponent(ref),
      {
        headers: getGitlabHeaders(this.options),
        timeout: this.timeout,
      },
    );
    const body: BaseProviderAPIBranch = await response.json();
    return body;
  }

  private async _fetchTree(
    projectId: string,
    ref: string,
    path: string,
    page: number,
  ) {
    const response = Ky.get(
      this.url +
        "/" +
        "projects/" +
        encodeURIComponent(projectId) +
        "/repository/tree?" +
        querystring.stringify({
          page,
          path,
          per_page: this.treePerPage,
          ref,
        }),
      {
        headers: getGitlabHeaders(this.options),
        timeout: this.timeout,
      },
    );
    const { headers } = await response;
    const records: BaseProviderAPITreeFile[] = await response.json();

    return { headers, records };
  }
}
