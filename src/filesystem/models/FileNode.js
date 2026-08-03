import FileSystemNode from "./FileSystemNode.js";

export default class FileNode extends FileSystemNode{

   constructor(name, parent = null, options = {}) {
    super(name, parent, options);
    this.content = options.content;
    this.mimeType = options.mimeType;
    this.extension = options.extension;
  }

   _calculateSize(content) {
    if (typeof content === 'string') {
      return new Blob([content]).size;
    } else if (content instanceof Blob || content instanceof ArrayBuffer) {
      return content.size || content.byteLength || 0;
    } else if (content && typeof content.length === 'number') {
      return content.length;
    }
    return 0;
  }

  isDirectory(){
    return false;
  }
}
