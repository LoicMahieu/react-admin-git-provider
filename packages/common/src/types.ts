import { CacheProvider } from "./cacheProviders";

export interface ListParams {
  pagination?: {
    page?: number;
    perPage?: number;
  };
  sort?: {
    field?: string | null;
    order?: "ASC" | "DESC" | null;
  };
  filter?: object;
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
  previousData: object;
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

export interface GetListOutput {
  data: Record[];
  total: number;
}
export interface GetOneOutput {
  data: Record | undefined;
}
export type CreateOutput = GetOneOutput;
export type UpdateOutput = GetOneOutput;
export type DeleteOutput = GetOneOutput;
export interface UpdateManyOutput {
  data: Record[];
}
export type GetManyOutput = UpdateManyOutput;
export type GetManyReferenceOutput = GetManyOutput;
export interface DeleteManyOutput {
  data: string[];
}

export interface Record {
  id: string | number;
}

export interface ProviderOptions {
  projectId: string;
  ref: string;
  basePath?: string;
  cacheProvider?: CacheProvider;
}

export declare class IProvider {
  public getList(params: ListParams): Promise<GetListOutput>;

  public getOne(params: GetOneParams): Promise<GetOneOutput>;

  public getMany(params: GetManyParams): Promise<GetManyOutput>;

  public getManyReference(
    params: GetManyReferenceParams,
  ): Promise<GetManyReferenceOutput>;

  public create(params: CreateParams): Promise<CreateOutput>;

  public update(params: UpdateParams): Promise<UpdateOutput>;

  public updateMany(params: UpdateManyParams): Promise<UpdateManyOutput>;

  public delete(params: DeleteParams): Promise<DeleteOutput>;

  public deleteMany(params: DeleteManyParams): Promise<DeleteManyOutput>;
}
