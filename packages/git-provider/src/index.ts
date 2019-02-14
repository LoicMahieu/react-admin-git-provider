import * as gitlabAuth from "./providers/gitlab/authProvider";
import { ProviderBranch as GitlabProviderBranch } from "./providers/gitlab/ProviderBranch";
import { ProviderCommit as GitlabProviderCommit } from "./providers/gitlab/ProviderCommit";
import { ProviderFileList as GitlabProviderFileList } from "./providers/gitlab/ProviderFileList";
import { ProviderPipeline as GitlabProviderPipeline } from "./providers/gitlab/ProviderPipeline";
import { createDataProvider } from "./reactAdmin";

export {
  gitlabAuth,
  createDataProvider,
  GitlabProviderBranch,
  GitlabProviderCommit,
  GitlabProviderFileList,
  GitlabProviderPipeline,
};
