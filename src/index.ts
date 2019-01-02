export { createAuthProvider, initialCheckForToken } from "./authProvider";
import { createGitlabOptions, createRAProvider } from "./baseProvider";
import { ProviderEntity } from "./ProviderEntity";
import { PipelineProvider } from "./ProviderPipeline";

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
  basePath: string;
  gitlabOptions: { host: string };
}) =>
  createRAProvider(
    new PipelineProvider(createGitlabOptions(gitlabOptions), projectId, ref),
  );
