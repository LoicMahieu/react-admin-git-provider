import { Repositories, RepositoryFiles, Commits } from "gitlab";
import uuid from "uuid";
import { basename, extname } from "path";

export type ListParams = {
  pagination: {
    page: number;
    perPage: number;
  };
};
export type GetOneParams = {
  id: string;
};
export type GetManyParams = {
  ids: string[];
};
export type CreateParams = {
  data: Object;
};
export type UpdateParams = {
  id: string;
  data: Object;
};
export type DeleteParams = {
  id: string;
  previousData: Object;
};
export type DeleteManyParams = {
  ids: string[];
};
export type Params =
  | ListParams
  | GetOneParams
  | GetManyParams
  | CreateParams
  | UpdateParams
  | DeleteParams
  | DeleteManyParams;

type GetListOutput = { data: Object[]; total: number };
type GetOneOutput = { data: Object };
type CreateOutput = { data: Object };
type UpdateOutput = { data: Object };
type DeleteOutput = { data: Object };
type DeleteManyOutput = { data: string[] };
type GetManyOutput = { data: Object[] };
type UpdateManyOutput = { data: Object[] };
type GetManyReferenceOutput = { data: Object[]; total: number };

type TreeFile = {
  id: string;
  mode: string;
  name: string;
  path: string;
  type: string;
};

type File = {
  content: string;
  encoding: string;
  filePath: string;
};

type Entity = {
  id: string;
}

export class EntityProvider {
  private readonly repositories: Repositories;
  private readonly repositoryFiles: RepositoryFiles;
  private readonly commits: Commits;
  private readonly projectId: string;
  private readonly ref: string;
  private readonly basePath: string;

  constructor(gitlabOptions: object, projectId: string, ref: string, basePath: string) {
    this.projectId = projectId;
    this.ref = ref;
    this.basePath = basePath;
    this.repositories = new Repositories(gitlabOptions);
    this.repositoryFiles = new RepositoryFiles(gitlabOptions);
    this.commits = new Commits(gitlabOptions);
  }

  private _createEntity = (data: object): Entity => ({
    ...data,
    id: uuid(),
  })

  private _parseEntity = (file: File) => {
    const content = JSON.parse(
      Buffer.from(file.content, file.encoding).toString("utf8"),
    );
    return {
      id: basename(file.filePath, extname(file.filePath)),
      ...content,
    };
  };

  private _stringifyEntity = (entity: Entity) => {
    const { id, ...data } = entity
    return JSON.stringify(data, null, 2);
  };

  private _getFilePath = (entityId: string) => {
    return this.basePath + '/' + entityId + '.json'
  }

  async getList(params: ListParams): Promise<GetListOutput> {
    const tree = (await this.repositories.tree(this.projectId, {
      ref: this.ref,
      path: this.basePath,
    })) as TreeFile[];
    const start = (params.pagination.page - 1) * params.pagination.perPage;
    const treeSliced = await tree.slice(start, start + params.pagination.perPage);
    const files = (await Promise.all(
      treeSliced.map(treeFile =>
        this.repositoryFiles.show(this.projectId, treeFile.path, this.ref),
      ),
    )) as File[];
    return {
      data: files.map(this._parseEntity),
      total: tree.length,
    };
  }

  async getOne(params: GetOneParams): Promise<GetOneOutput> {
    return {
      data: this._parseEntity((await this.repositoryFiles.show(
        this.projectId,
        this._getFilePath(params.id),
        this.ref,
      )) as File),
    };
  }

  async getMany(params: GetManyParams): Promise<GetManyOutput> {
    const manyFiles = (await Promise.all(
      params.ids.map(id =>
        this.repositoryFiles.show(this.projectId, this._getFilePath(id), this.ref),
      ),
    )) as File[];
    return {
      data: manyFiles.map(this._parseEntity),
    };
  }

  async create(params: CreateParams): Promise<CreateOutput> {
    const data = this._createEntity(params.data);

    await this.commits.create(
      this.projectId,
      this.ref,
      "Create",
      [
        {
          action: "create",
          filePath: this._getFilePath(data.id),
          content: this._stringifyEntity(data),
        },
      ],
      {},
    );
    return { data };
  }

  // TODO: check if data are equals, so skip commit
  async update(params: UpdateParams): Promise<UpdateOutput> {
    await this.commits.create(
      this.projectId,
      this.ref,
      "Update",
      [
        {
          action: "update",
          filePath: this._getFilePath(params.id),
          content: this._stringifyEntity(params.data as Entity),
        },
      ],
      {},
    );
    return { data: params.data };
  }

  async delete(params: DeleteParams): Promise<DeleteOutput> {
    await this.commits.create(
      this.projectId,
      this.ref,
      "Delete",
      [
        {
          action: "delete",
          filePath: this._getFilePath(params.id),
        },
      ],
      {},
    );
    return { data: params.previousData };
  }

  async deleteMany(params: DeleteManyParams): Promise<DeleteManyOutput> {
    const actions = params.ids.map(id => ({
      action: "delete" as "delete", // TS could be weird !
      filePath: id,
    }))
    await this.commits.create(
      this.projectId,
      this.ref,
      "Delete many",
      actions,
      {},
    );
    return { data: params.ids };
  }
}
