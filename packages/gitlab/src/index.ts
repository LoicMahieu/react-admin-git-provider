import { createDataProvider } from "@react-admin-git-provider/common";
import * as gitlabAuth from "./authProvider";
import { ProviderBranch as GitlabProviderBranch } from "./ProviderBranch";
import { ProviderCommit as GitlabProviderCommit } from "./ProviderCommit";
import {
  GitlabProviderFileOptions,
  ProviderFile as GitlabProviderFile,
} from "./ProviderFile";
import {
  GitlabProviderFileListOptions,
  ProviderFileList as GitlabProviderFileList,
} from "./ProviderFileList";
import { ProviderPipeline as GitlabProviderPipeline } from "./ProviderPipeline";
import {
  ProviderRawFileList as GitlabProviderRawFileList,
  GitlabProviderRawFileListOptions,
} from "./ProviderRawFileList";

export {
  gitlabAuth,
  createDataProvider,
  GitlabProviderBranch,
  GitlabProviderCommit,
  GitlabProviderFileList,
  GitlabProviderFileListOptions,
  GitlabProviderFile,
  GitlabProviderFileOptions,
  GitlabProviderPipeline,
  GitlabProviderRawFileList,
  GitlabProviderRawFileListOptions,
};
