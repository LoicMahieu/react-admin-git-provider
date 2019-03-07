import { createDataProvider } from "@react-admin-git-provider/common";
import * as gitlabAuth from "./authProvider";
import { ProviderBranch as GitlabProviderBranch } from "./ProviderBranch";
import { ProviderCommit as GitlabProviderCommit } from "./ProviderCommit";
import { ProviderFileList as GitlabProviderFileList } from "./ProviderFileList";
import { ProviderPipeline as GitlabProviderPipeline } from "./ProviderPipeline";

export {
  gitlabAuth,
  createDataProvider,
  GitlabProviderBranch,
  GitlabProviderCommit,
  GitlabProviderFileList,
  GitlabProviderPipeline,
};
