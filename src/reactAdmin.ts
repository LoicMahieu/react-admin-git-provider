import {
  CreateParams,
  DeleteManyParams,
  DeleteParams,
  GetManyParams,
  GetManyReferenceParams,
  GetOneParams,
  IProvider,
  ListParams,
  Params,
  UpdateManyParams,
  UpdateParams,
} from "./IProvider";

export const createReactAminProvider = (provider: IProvider) => async (
  type: string,
  resource: string,
  params: Params,
) => {
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
