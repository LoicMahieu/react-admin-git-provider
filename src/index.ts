export { createAuthProvider, initialCheckForToken } from "./authProvider";
import { createGitlabOptions, createRAProvider } from "./baseProvider";
import { ProviderBranch } from "./ProviderBranch";
import { ProviderCommit } from "./ProviderCommit";
import { ProviderEntity } from "./ProviderEntity";
import { ProviderPipeline } from "./ProviderPipeline";

export const createDataProviderEntity = ({
  projectId,
  ref,
  basePath: getBasePath,
  gitlabOptions,
}: {
  projectId: string;
  ref: string;
  basePath: string | ((resource: string) => string);
  gitlabOptions: { host: string };
}) => {
  const create = (basePath: string) =>
    new ProviderEntity(
      createGitlabOptions(gitlabOptions),
      projectId,
      ref,
      basePath,
    );
  return createRAProvider(
    typeof getBasePath === "function"
      ? resource => create(getBasePath(resource))
      : create(getBasePath),
  );
};

export const createDataProviderPipeline = ({
  projectId,
  ref,
  gitlabOptions,
}: {
  projectId: string;
  ref: string;
  gitlabOptions: { host: string };
}) =>
  createRAProvider(
    new ProviderPipeline(createGitlabOptions(gitlabOptions), projectId, ref),
  );

export const createDataProviderBranch = ({
  projectId,
  gitlabOptions,
}: {
  projectId: string;
  gitlabOptions: { host: string };
}) =>
  createRAProvider(
    new ProviderBranch(createGitlabOptions(gitlabOptions), projectId),
  );

export const createDataProviderCommit = ({
  projectId,
  ref,
  gitlabOptions,
}: {
  projectId: string;
  ref: string;
  gitlabOptions: { host: string };
}) =>
  createRAProvider(
    new ProviderCommit(createGitlabOptions(gitlabOptions), projectId, ref),
  );
