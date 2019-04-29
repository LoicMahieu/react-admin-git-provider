export interface BaseProviderAPITreeFile {
  id: string;
  path: string;
}

export interface BaseProviderAPIFile {
  blobId: string;
  content: string;
  encoding: string;
  filePath: string;
}

export interface BaseProviderAPICommitAction {
  /** The action to perform */
  action: "create" | "delete" | "move" | "update";
  /** Full path to the file. Ex. lib/class.rb */
  filePath: string;
  /** Original full path to the file being moved.Ex.lib / class1.rb */
  previousPath?: string;
  /** File content, required for all except delete. Optional for move */
  content?: string;
  /** text or base64. text is default. */
  encoding?: string;
  /** Last known file commit id. Will be only considered in update, move and delete actions. */
  lastCommitId?: string;
}

export class BaseProviderAPI {
  public async tree(
    projectId: string,
    ref: string,
    path: string,
  ): Promise<BaseProviderAPITreeFile[]> {
    throw new Error("Not implemented!");
  }
  public async showFile(
    projectId: string,
    ref: string,
    path: string,
  ): Promise<BaseProviderAPIFile | undefined> {
    throw new Error("Not implemented!");
  }
  public async commit(
    projectId: string,
    ref: string,
    message: string,
    action: BaseProviderAPICommitAction[],
  ) {
    throw new Error("Not implemented!");
  }
}
