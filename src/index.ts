export { createAuthProvider, initialCheckForToken } from "./authProvider";
import { createGitlabOptions, createRAProvider } from "./baseProvider";
import { ProviderEntity } from "./ProviderEntity";
import { PipelineProvider } from "./ProviderPipeline";

export const createDataProviderEntity = ({
  projectId,
  ref,
  basePath,
  gitlabOptions,
}: {
  projectId: string;
  ref: string;
  basePath: string;
  gitlabOptions: { host: string };
}) =>
  createRAProvider(
    new ProviderEntity(
      createGitlabOptions(gitlabOptions),
      projectId,
      ref,
      basePath,
    ),
  );

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
