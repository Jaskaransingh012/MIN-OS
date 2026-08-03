export default class pathResolver {
  /**
   * Split a path into an array of components (ignoring empty parts).
   * e.g. "/foo/bar/" → ["foo", "bar"]
   */
  static splitPath(path) {
    if (!path || path === '/') return [];
    return path.split('/').filter(part => part.length > 0);
  }

  /**
   * Resolve a path (absolute or relative) to a FileSystemNode.
   */
  static resolvePath(path, currentFolder, root) {
    if (!path) return currentFolder;

    const parts = this.splitPath(path);
    let node = path.startsWith('/') ? root : currentFolder;

    for (const part of parts) {
      if (part === '..') {
        if (node.parent) node = node.parent;
        continue;
      }
      if (part === '.') continue;
      if (!node.isDirectory()) {
        throw new Error(`Cannot traverse: ${node.getAbsolutePath()} is not a directory`);
      }
      const child = node.getChild(part);
      if (!child) {
        throw new Error(`Path not found: ${path} (component ${part} missing)`);
      }
      node = child;
    }
    return node;
  }

  static getParentPath(path) {
    if (path === '/') return '/';
    const parts = this.splitPath(path);
    if (parts.length === 0) return '/';
    parts.pop();
    return '/' + parts.join('/');
  }

  static getBaseName(path) {
    const parts = this.splitPath(path);
    return parts.length === 0 ? '' : parts[parts.length - 1];
  }
}
