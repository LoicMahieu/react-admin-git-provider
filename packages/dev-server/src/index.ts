import bodyParser from "body-parser";
import { Application } from "express";
import asyncHandler from "express-async-handler";
import fs from "fs-extra";
import hasha from "hasha";
import path from "path";

interface IOptions {
  cwd: string;
  prefix?: string;
}

// Copied from node-gitlab
export interface CommitAction {
  /** The action to perform */
  action: "create" | "delete" | "move" | "update";
  /** Full path to the file. Ex. lib/class.rb */
  file_path: string;
  /** File content, required for all except delete. Optional for move */
  content?: string;
  /** text or base64. text is default. */
  encoding?: string;
}

export async function applyMiddlewares(app: Application, options: IOptions) {
  const prefix = options.prefix || "";

  app.get(
    `${prefix}/api/v4/projects/:projectId/repository/branches/:branch`,
    branches(options),
  );
  app.get(
    `${prefix}/api/v4/projects/:projectId/repository/tree`,
    tree(options),
  );
  app.get(
    `${prefix}/api/v4/projects/:projectId/repository/files/*`,
    readFile(options),
  );
  app.post(
    `${prefix}/api/v4/projects/:projectId/repository/commits`,
    bodyParser.json(),
    commit(options),
  );
}

async function fileToTree(filePath: string, options: IOptions) {
  const absFilePath = path.join(options.cwd, filePath);
  if (!(await fs.pathExists(absFilePath))) {
    return;
  }

  const stat = await fs.stat(absFilePath);

  if (stat.isDirectory()) {
    return {
      id: "a67a42c0ff0435776c2873d06ff6ec7cd8940be3",
      mode: "040000",
      name: path.basename(filePath),
      path: filePath,
      type: "tree",
    };
  } else {
    const content = await fs.readFile(absFilePath);
    const hash = hasha(content);
    return {
      id: hash,
      mode: "100644",
      name: path.basename(filePath),
      path: filePath,
      type: "blob",
    };
  }
}

async function doCommitAction(action: CommitAction, options: IOptions) {
  const absFilePath = path.join(options.cwd, action.file_path);
  if (action.action === "create" || action.action === "update") {
    await fs.writeFile(
      absFilePath,
      action.content,
      action.encoding === "base64" ? "base64" : "utf8",
    );
  } else if (action.action === "delete") {
    await fs.unlink(absFilePath);
  }
}

const branches = (options: IOptions) =>
  asyncHandler(async (req, res, next) => {
    const { branch } = req.params;
    res.send({
      name: branch,
      commit: {
        id: branch,
      },
    });
  })

const tree = (options: IOptions) =>
  asyncHandler(async (req, res, next) => {
    const basePath = req.query.path;
    const absBasePath = path.join(options.cwd, basePath);
    if (
      !(await fs.pathExists(absBasePath)) &&
      !(await fs.stat(absBasePath)).isDirectory
    ) {
      return next();
    }

    const files = await fs.readdir(absBasePath);
    const treeFiles = await Promise.all(
      files.map(fileName => fileToTree(path.join(basePath, fileName), options)),
    );

    res.send(treeFiles);
  });

const readFile = (options: IOptions) =>
  asyncHandler(async (req, res, next) => {
    const absFilePath = path.join(options.cwd, req.params["0"]);
    if (!(await fs.pathExists(absFilePath))) {
      return next();
    }

    const stat = await fs.stat(absFilePath);

    if (stat.isDirectory()) {
      return next();
    }

    const content = await fs.readFile(absFilePath);
    const hash = hasha(content);

    res.send({
      blob_id: hash,
      commit_id: "",
      content: content.toString("base64"),
      content_sha256: hash,
      encoding: "base64",
      file_name: path.basename(req.params["0"]),
      file_path: req.params["0"],
      last_commit_id: "",
      ref: "master",
      size: content.length,
    });
  });

const commit = (options: IOptions) =>
  asyncHandler(async (req, res, next) => {
    const actions: CommitAction[] = req.body.actions || [];
    await Promise.all(actions.map(action => doCommitAction(action, options)));
    res.send({ ok: true });
  });
