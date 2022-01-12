import {
  BaseProviderRawFileList,
  ProviderRawFileListOptions,
} from "@react-admin-git-provider/common";
import { GitlabOptions, GitlabProviderAPI } from "./GitlabProviderAPI";

export interface GitlabProviderRawFileListOptions extends ProviderRawFileListOptions {
  gitlabOptions: GitlabOptions;
}

export class ProviderRawFileList extends BaseProviderRawFileList {
  constructor({ gitlabOptions, ...options }: GitlabProviderRawFileListOptions) {
    super(new GitlabProviderAPI(gitlabOptions), options);
  }
}
