// DirectoryNode.js
import FileSystemNode from './FileSystemNode.js';

export class DirectoryNode extends FileSystemNode {
  constructor(name, parent = null, options = {}) {
    super(name, parent, options);
    this._children = new Map(); // name → FileSystemNode
  }

  addChild(child) {
    if (child.parent && child.parent !== this) {
      child.parent.removeChild(child);
    }
    this._children.set(child.name, child);
    child.parent = this;
    this.modify();
  }

  removeChild(child) {
    const name = typeof child === 'string' ? child : child.name;
    const removed = this._children.delete(name);
    if (removed) this.modify();
    return removed;
  }

  getChild(name) {
    return this._children.get(name) || null;
  }

  hasChild(name) {
    return this._children.has(name);
  }

  listChildren() {
    return Array.from(this._children.values());
  }

  getSize(){
    return this.size;
  }

  isEmpty(){
    return this.size == 0;
  }

  toJSON() {
    const base = super.toJSON();
    return {
      ...base,
      children: Array.from(this._children.keys())
    };
  }

   _calculateSize() {
        let totSize = 0;
        for(let i =0;i <this._children.length; i++){
            totSize += this._children[i];
        }
        this.size = totSize;
  }


}
