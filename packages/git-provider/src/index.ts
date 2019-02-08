import * as gitlabAuth from "./providers/gitlab/authProvider";
import { ProviderBranch as GitlabProviderBranch } from "./providers/gitlab/ProviderBranch";
import { ProviderCommit as GitlabProviderCommit } from "./providers/gitlab/ProviderCommit";
import { ProviderEntity as GitlabProviderEntity } from "./providers/gitlab/ProviderEntity";
import { ProviderPipeline as GitlabProviderPipeline } from "./providers/gitlab/ProviderPipeline";
import { createDataProvider } from "./reactAdmin";

export {
  gitlabAuth,
  createDataProvider,
  GitlabProviderBranch,
  GitlabProviderCommit,
  GitlabProviderEntity,
  GitlabProviderPipeline,
};
