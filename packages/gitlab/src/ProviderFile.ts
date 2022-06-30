import {
  BaseProviderFile,
  ProviderFileOptions,
} from "@react-admin-git-provider/common";
import { GitlabOptions, GitlabProviderAPI } from "./GitlabProviderAPI";

export interface GitlabProviderFileOptions extends ProviderFileOptions {
  gitlabOptions?: GitlabOptions;
  gitlabProviderAPI?: GitlabProviderAPI;
}

export class ProviderFile extends BaseProviderFile {
  constructor({
    gitlabOptions,
    gitlabProviderAPI,
    ...options
  }: GitlabProviderFileOptions) {
    super(
      gitlabProviderAPI
        ? gitlabProviderAPI
        : new GitlabProviderAPI(gitlabOptions || {}),
      options,
    );
  }
}
