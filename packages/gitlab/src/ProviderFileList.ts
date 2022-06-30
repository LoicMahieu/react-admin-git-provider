import {
  BaseProviderFileList,
  ProviderFileListOptions,
} from "@react-admin-git-provider/common";
import { GitlabOptions, GitlabProviderAPI } from "./GitlabProviderAPI";

export interface GitlabProviderFileListOptions extends ProviderFileListOptions {
  gitlabOptions?: GitlabOptions;
  gitlabProviderAPI?: GitlabProviderAPI;
}

export class ProviderFileList extends BaseProviderFileList {
  constructor({
    gitlabOptions,
    gitlabProviderAPI,
    ...options
  }: GitlabProviderFileListOptions) {
    super(
      gitlabProviderAPI
        ? gitlabProviderAPI
        : new GitlabProviderAPI(gitlabOptions || {}),
      options,
    );
  }
}
