import { getToken } from "./authToken";
export { createAuthProvider, initialCheckForToken } from "./authProvider";
import { ProviderOptions } from "./IProvider";
import { ProviderBranch as GitlabProviderBranch } from "./providers/gitlab/ProviderBranch";
import { ProviderCommit as GitlabProviderCommit } from "./providers/gitlab/ProviderCommit";
import { ProviderEntity as GitlabProviderEntity } from "./providers/gitlab/ProviderEntity";
import { ProviderPipeline as GitlabProviderPipeline } from "./providers/gitlab/ProviderPipeline";
import { createReactAminProvider } from "./reactAdmin";

export {
  GitlabProviderBranch,
  GitlabProviderCommit,
  GitlabProviderEntity,
  GitlabProviderPipeline,
};

export const createDataProvider = (
  ProviderClass:
    | typeof GitlabProviderBranch
    | typeof GitlabProviderCommit
    | typeof GitlabProviderEntity
    | typeof GitlabProviderPipeline,
  options: ProviderOptions,
) => {
  const oauthToken = getToken() || undefined;
  if (!oauthToken) {
    throw new Error("User is not logged.");
  }
  options = {
    basePath: "",
    ...options,
    gitlabOptions: {
      oauthToken: getToken() || undefined,
      ...options.gitlabOptions,
    },
  };
  const provider = new ProviderClass(options);
  return createReactAminProvider(provider);
};
