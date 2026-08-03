import FileNode from '../models/FileNode.js';
import DirectoryNode from '../models/DirectoryNode.js';

export default class FileRepository {
  constructor(storage) {
    this.storage = storage;
    this.rootKey = 'fs_root';
  }

  /**
   * Serialize a node (and its entire subtree) to a plain JSON object.
   */
  serialization(node) {
    if (!node) return null;
    // Use the node's built-in toJson if available
    const base = node.toJson ? node.toJson() : { ...node };
    const type = node.isDirectory() ? 'directory' : 'file';
    const result = { ...base, type };

    if (node.isDirectory()) {
      // Directory: serialize children recursively
      const children = node.listChildren();
      result.children = children.map(child => this.serialization(child));
    } else {
      // File: store content, mime type, extension
      result.content = node.content || '';
      result.mimeType = node.mimeType || '';
      result.extension = node.extension || '';
    }
    return result;
  }

  /**
   * Deserialize a plain object back into a FileSystemNode tree.
   */
  deserialization(data) {
    if (!data) return null;
    const { type, children, content, mimeType, extension, ...common } = data;

    let node;
    if (type === 'directory') {
      node = new DirectoryNode(common.name, null, {
        permissions: common.permissions,
        metaData: common.metadata || common.metaData,
        size: common.size || 0
      });
      // Restore internal fields (id, timestamps)
      node.id = common.id;
      node.createdAt = common.createdAt;
      node.modifiedAt = common.modifiedAt;
      node.accessedAt = common.accessedAt;
      // Rebuild children
      if (children) {
        for (const childData of children) {
          const child = this.deserialization(childData);
          if (child) node.addChild(child);
        }
      }
    } else {
      // file
      node = new FileNode(common.name, null, {
        permissions: common.permissions,
        metaData: common.metadata || common.metaData,
        size: common.size || 0,
        content: content || '',
        mimeType: mimeType || '',
        extension: extension || ''
      });
      node.id = common.id;
      node.createdAt = common.createdAt;
      node.modifiedAt = common.modifiedAt;
      node.accessedAt = common.accessedAt;
    }
    return node;
  }

  /**
   * Save the entire tree starting from the given root node.
   */
  async save(rootNode) {
    const serialized = this.serialization(rootNode);
    await this.storage.setItem(this.rootKey, serialized);
  }

  /**
   * Load the root node from storage. Returns null if none exists.
   */
  async load() {
    const data = await this.storage.getItem(this.rootKey);
    if (!data) return null;
    return this.deserialization(data);
  }
}
