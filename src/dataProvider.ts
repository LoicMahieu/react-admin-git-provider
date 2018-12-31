import { getToken } from "./authToken";
import {
  CreateParams,
  DeleteManyParams,
  DeleteParams,
  EntityProvider,
  GetManyParams,
  GetManyReferenceParams,
  GetOneParams,
  ListParams,
  Params,
  UpdateManyParams,
  UpdateParams,
} from "./EntityProvider";

export const dataProvider = ({
  projectId,
  ref,
  basePath,
  gitlabOptions,
}: {
  projectId: string;
  ref: string;
  basePath: string;
  gitlabOptions: { host: string };
}) => async (type: string, resource: string, params: Params) => {
  const oauthToken = getToken() || undefined;
  if (!oauthToken) {
    throw new Error("User is not logged.");
  }

  const entityProvider = new EntityProvider(
    {
      ...gitlabOptions,
      oauthToken,
    },
    projectId,
    ref,
    basePath,
  );

  switch (type) {
    case "GET_LIST":
      return entityProvider.getList(params as ListParams);

    case "GET_ONE":
      return entityProvider.getOne(params as GetOneParams);

    case "GET_MANY":
      return entityProvider.getMany(params as GetManyParams);

    case "GET_MANY_REFERENCE":
      return entityProvider.getManyReference(params as GetManyReferenceParams);

    case "CREATE":
      return entityProvider.create(params as CreateParams);

    case "UPDATE":
      return entityProvider.update(params as UpdateParams);

    case "UPDATE_MANY":
      return entityProvider.updateMany(params as UpdateManyParams);

    case "DELETE":
      return entityProvider.delete(params as DeleteParams);

    case "DELETE_MANY":
      return entityProvider.deleteMany(params as DeleteManyParams);

    default:
      throw new Error(`Unsupported Data Provider request type ${type}`);
  }
};
