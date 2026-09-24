import FileRepository from "./FileRepository.js";
import DirectoryNode from "../models/DirectoryNode.js";
import FileNode from "../models/FileNode.js";
import pathResolver from "./PathResolver.js";
import FileTypeRegistry from "./FileTypeRegistery.js";
import FileTrie from "../constants/FileTrie.js";

export default class FileSystem {
  constructor(storageAdapter) {
    this.storageAdapter = storageAdapter;
    this.repository = new FileRepository(storageAdapter);
    this.root = null;
    this.currentFolder = null;
    this.path = "/";
    this.fileTypeRegistry = new FileTypeRegistry();

    this.fileTrie = new FileTrie();
  }

  /**
   * Initialize the file system: load from storage or create a fresh root.
   */
  async init() {
    await this.storageAdapter.init();
    const loadedRoot = await this.repository.load();
    if (loadedRoot) {
      this.root = loadedRoot;
    } else {
      // Create a fresh root directory (name empty for path "/")
      this.root = new DirectoryNode("", null, {
        permissions: { read: true, write: true, execute: true },
      });
      await this.repository.save(this.root);
    }
    this.currentFolder = this.root;
    this.path = "/";
  }

  /**
   * Resolve a path (absolute or relative) to a node.
   * Throws if not found.
   */
  _resolvePath(path) {
    return pathResolver.resolvePath(path, this.currentFolder, this.root);
  }

  /**
   * Change the current working directory.
   */
  async changeDirectory(path) {
    const target = this._resolvePath(path);
    if (!target.isDirectory()) {
      throw new Error(`Not a directory: ${path}`);
    }
    this.currentFolder = target;
    this.path = target.getAbsolutePath();
  }

  async createDirectory(name, parent = null) {
    const parentNode = parent
      ? this._resolvePath(parent.getPath())
      : this.currentFolder;
    if (!parentNode.isDirectory()) {
      throw new Error("Parent is not a directory");
    }
    if (parentNode.hasChild(name)) {
      throw new Error(`Item already exists: ${name}`);
    }
    const newDir = new DirectoryNode(name, parentNode, {
      permissions: { read: true, write: true, execute: true },
    });
    parentNode.addChild(newDir);
    await this._save();
    return newDir;
  }

  async createFile(name, content = "", options = {}, parent = null) {
    const parentNode = parent
      ? this._resolvePath(parent.getPath())
      : this.currentFolder;
    if (!parentNode.isDirectory()) {
      throw new Error("Parent is not a directory");
    }
    if (parentNode.hasChild(name)) {
      throw new Error(`Item already exists: ${name}`);
    }
    const ext = name.includes(".") ? name.split(".").pop() : "";
    const mimeType = this.fileTypeRegistry.getMimeType(ext);
    const fileNode = new FileNode(name, parentNode, {
      ...options,
      content,
      mimeType,
      extension: ext,
      permissions: {
        read: true,
        write: true,
        execute: false,
        ...(options.permissions || {}),
      },
    });
    parentNode.addChild(fileNode);
    await this._save();
    return fileNode;
  }

  async deleteDirectory(path) {
    const node = this._resolvePath(path);
    if (!node.isDirectory()) {
      throw new Error(`Not a directory: ${path}`);
    }
    if (!node.isEmpty()) {
      throw new Error(`Directory not empty: ${path}`);
    }
    const parent = node.parent;
    if (!parent) {
      throw new Error("Cannot delete root directory");
    }
    parent.removeChild(node);
    await this._save();
  }

  async deleteFile(path) {
    const node = this._resolvePath(path);
    if (!node.isFile()) {
      throw new Error(`Not a file: ${path}`);
    }
    const parent = node.parent;
    if (!parent) {
      throw new Error("Cannot delete root (not a file)");
    }
    parent.removeChild(node);
    await this._save();
  }

  async searchInCurrentDirectory(pattern) {
    const children = this.currentFolder.listChildren();
    return children.filter((child) => child.name.includes(pattern));
  }

  async searchInFullSystem(pattern) {
    const results = [];
    const traverse = (node) => {
      if (node.name.includes(pattern)) results.push(node);
      if (node.isDirectory()) {
        for (const child of node.listChildren()) traverse(child);
      }
    };
    traverse(this.root);
    return results;
  }

  async getCurrentPath() {
    return this.path;
  }

   read(path) {
    const node = this._resolvePath(path);
    if (!node.isFile()) {
      throw new Error(`Not a file: ${path}`);
    }
    return node.content || "";
  }

  async write(path, content) {
    const node = this._resolvePath(path);
    if (!node.isFile()) {
      throw new Error(`Not a file: ${path}`);
    }
    node.content = content;
    // Recalculate size using the node's own method if available
    if (typeof node._calculateSize === "function") {
      node.size = node._calculateSize(content);
    } else {
      // fallback: Blob size
      node.size = new Blob([content]).size;
    }
    node.modify();
    await this._save();
  }

  async copyFile(sourcePath, destPath) {
    const sourceNode = this._resolvePath(sourcePath);

    if (!sourceNode.isFile()) {
      throw new Error(`Source is not a file: ${sourcePath}`);
    }

    const destName = pathResolver.getBaseName(destPath);

    if (!destName) {
      throw new Error(`Invalid destination: ${destPath}`);
    }

    const destDirPath = pathResolver.getParentPath(destPath);

    const destParent = this._resolvePath(destDirPath);

    if (!destParent.isDirectory()) {
      throw new Error(`Destination parent is not a directory: ${destDirPath}`);
    }

    if (destParent.hasChild(destName)) {
      throw new Error(`Destination already exists: ${destPath}`);
    }

    const newFile = new FileNode(destName, destParent, {
      content: sourceNode.content,
      mimeType: sourceNode.mimeType,
      extension: sourceNode.extension,
      permissions: { ...sourceNode.permissions },
      metaData: { ...sourceNode.metaData },
    });

    destParent.addChild(newFile);

    await this._save();
  }

  async moveFile(sourcePath, destPath) {
    const sourceNode = this._resolvePath(sourcePath);

    if (!sourceNode.isFile()) {
      throw new Error(`Source is not a file: ${sourcePath}`);
    }

    let destParent;
    let destName;

    // Try to resolve destination as an existing node
    try {
      const destNode = this._resolvePath(destPath);

      // mv file.txt ../
      // Destination is an existing directory
      if (destNode.isDirectory()) {
        destParent = destNode;
        destName = sourceNode.name;
      } else {
        throw new Error(`Destination already exists: ${destPath}`);
      }
    } catch (error) {
      // Destination doesn't exist,
      // so treat it as a new filename/path
      destName = pathResolver.getBaseName(destPath);

      if (!destName || destName === "." || destName === "..") {
        throw new Error(`Invalid destination: ${destPath}`);
      }

      const destDirPath = pathResolver.getParentPath(destPath);

      destParent = this._resolvePath(destDirPath);

      if (!destParent.isDirectory()) {
        throw new Error(
          `Destination parent is not a directory: ${destDirPath}`,
        );
      }
    }

    if (destParent.hasChild(destName)) {
      throw new Error(`Destination already exists: ${destPath}`);
    }

    // Same directory → just rename
    if (destParent === sourceNode.parent) {
      sourceNode.rename(destName);
      await this._save();
      return;
    }

    const newFile = new FileNode(destName, destParent, {
      content: sourceNode.content,
      mimeType: sourceNode.mimeType,
      extension: sourceNode.extension,
      permissions: { ...sourceNode.permissions },
      metaData: { ...sourceNode.metaData },
    });

    destParent.addChild(newFile);

    await this._save();

    await this.deleteFile(sourcePath);
  }

  async stat(path) {
    const node = this._resolvePath(path);
    return {
      id: node.id,
      name: node.name,
      isDirectory: node.isDirectory(),
      isFile: node.isFile(),
      size: node.size,
      createdAt: node.createdAt,
      modifiedAt: node.modifiedAt,
      accessedAt: node.accessedAt,
      permissions: node.permissions,
      metadata: node.metaData || node.metadata,
      path: node.getAbsolutePath(),
    };
  }

  async _save() {
    await this.repository.save(this.root);
  }

  getChildren(path){
    const target = this._resolvePath(path);
    if (!target.isDirectory()) {
      throw new Error(`Not a directory: ${path}`);
    }
    return target.listChildren();
  }


  buildAutoCompleteTrie() {
    const children = this.currentFolder.listChildren();

    for(const child of children) {
      this.fileTrie.insert(child.name, {
        name: child.name,
        isDirectory: child.isDirectory(),
        isFile: child.isFile(),
        node : child
      });
    }
  }

  getAutoCompleteSuggestions(prefix) {
    this.buildAutoCompleteTrie();

    return this.fileTrie.searchPrefix(prefix);
  }e
}
