import { BaseProviderFileList, ProviderFileListOptions } from "@react-admin-git-provider/common";
import { GitlabProviderAPI } from "./GitlabProviderAPI";

export class ProviderFileList extends BaseProviderFileList {
  constructor({ gitlabOptions, ...options }: ProviderFileListOptions) {
    super(new GitlabProviderAPI(gitlabOptions), options);
  }
}
