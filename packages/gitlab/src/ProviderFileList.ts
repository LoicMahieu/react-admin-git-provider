import { BaseProviderFileList, ProviderFileListOptions } from "@react-admin-git-provider/common";
import { GitlabOptions, GitlabProviderAPI } from "./GitlabProviderAPI";

export interface GitlabProviderFileListOptions extends ProviderFileListOptions {
  gitlabOptions: GitlabOptions
}

export class ProviderFileList extends BaseProviderFileList {
  constructor({ gitlabOptions, ...options }: GitlabProviderFileListOptions) {
    super(new GitlabProviderAPI(gitlabOptions), options);
  }
}
