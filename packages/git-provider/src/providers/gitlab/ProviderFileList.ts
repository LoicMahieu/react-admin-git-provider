import { BaseProviderFileList, ProviderFileListOptions } from "../../BaseProviderFileList";
import { GitlabProviderAPI } from "./GitlabProviderAPI";

export class ProviderFileList extends BaseProviderFileList {
  constructor({ gitlabOptions, ...options }: ProviderFileListOptions) {
    super(new GitlabProviderAPI(gitlabOptions), options);
  }
}
