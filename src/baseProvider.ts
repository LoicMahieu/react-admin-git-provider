import { getToken } from "./authToken";
import { IProvider } from "./IProvider";
export interface ListParams {
  pagination: {
    page: number;
    perPage: number;
  };
  sort: {
    field: string;
    order: "ASC" | "DESC";
  };
  filter: object;
}
export interface GetOneParams {
  id: string;
}
export interface GetManyParams {
  ids: string[];
}
export interface GetManyReferenceParams extends ListParams {
  target: string;
  id: string;
}
export interface CreateParams {
  data: object;
}
export interface UpdateParams {
  id: string;
  data: object;
}
export interface UpdateManyParams {
  ids: string[];
  data: object;
}
export interface DeleteParams {
  id: string;
  previousData: object;
}
export interface DeleteManyParams {
  ids: string[];
}
export type Params =
  | ListParams
  | GetOneParams
  | GetManyParams
  | CreateParams
  | UpdateParams
  | DeleteParams
  | DeleteManyParams;

export const createGitlabOptions = (gitlabOptions: object) => ({
  ...gitlabOptions,
  oauthToken: getToken(),
});

type GetProviderOption =
  | IProvider
  | ((resource: string) => IProvider);

export const createRAProvider = (getProvider: GetProviderOption) => async (
  type: string,
  resource: string,
  params: Params,
) => {
  const oauthToken = getToken() || undefined;
  if (!oauthToken) {
    throw new Error("User is not logged.");
  }
  const provider =
    typeof getProvider === "function" ? getProvider(resource) : getProvider;
  switch (type) {
    case "GET_LIST":
      return provider.getList(params as ListParams);
    case "GET_ONE":
      return provider.getOne(params as GetOneParams);
    case "GET_MANY":
      return provider.getMany(params as GetManyParams);
    case "GET_MANY_REFERENCE":
      return provider.getManyReference(params as GetManyReferenceParams);
    case "CREATE":
      return provider.create(params as CreateParams);
    case "UPDATE":
      return provider.update(params as UpdateParams);
    case "UPDATE_MANY":
      return provider.updateMany(params as UpdateManyParams);
    case "DELETE":
      return provider.delete(params as DeleteParams);
    case "DELETE_MANY":
      return provider.deleteMany(params as DeleteManyParams);
    default:
      throw new Error(`Unsupported Data Provider request type ${type}`);
  }
};
