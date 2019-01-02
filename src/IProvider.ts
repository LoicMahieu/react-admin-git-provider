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

export interface GetListOutput {
  data: Record[];
  total: number;
}
export interface GetOneOutput {
  data: Record;
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

export interface IProvider {
  getList(params: ListParams): Promise<GetListOutput>;

  getOne(params: GetOneParams): Promise<GetOneOutput>;

  getMany(params: GetManyParams): Promise<GetManyOutput>;

  getManyReference(
    params: GetManyReferenceParams,
  ): Promise<GetManyReferenceOutput>;

  create(params: CreateParams): Promise<CreateOutput>;

  update(params: UpdateParams): Promise<UpdateOutput>;

  updateMany(params: UpdateManyParams): Promise<UpdateManyOutput>;

  delete(params: DeleteParams): Promise<DeleteOutput>;

  deleteMany(params: DeleteManyParams): Promise<DeleteManyOutput>;
}
