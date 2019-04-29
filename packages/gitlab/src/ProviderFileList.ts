import { BaseProviderFileList, ProviderFileListOptions } from "@react-admin-git-provider/common";
import { GitlabOptions, GitlabProviderAPI } from "./GitlabProviderAPI";

export class ProviderFileList extends BaseProviderFileList {
  constructor({ gitlabOptions, ...options }: ProviderFileListOptions & { gitlabOptions: GitlabOptions }) {
    super(new GitlabProviderAPI(gitlabOptions), options);
  }
}
