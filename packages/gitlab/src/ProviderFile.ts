import {
  BaseProviderFile,
  ProviderFileOptions,
} from "@react-admin-git-provider/common";
import { GitlabOptions, GitlabProviderAPI } from "./GitlabProviderAPI";

export interface GitlabProviderFileOptions extends ProviderFileOptions {
  gitlabOptions: GitlabOptions;
}

export class ProviderFile extends BaseProviderFile {
  constructor({ gitlabOptions, ...options }: GitlabProviderFileOptions) {
    super(new GitlabProviderAPI(gitlabOptions), options);
  }
}
