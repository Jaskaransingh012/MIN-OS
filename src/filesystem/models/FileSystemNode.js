export default class FileSystemNode {

    static _nextId = 0;


    constructor(name, parent = null, options = {}) {


        if (new.target === FileSystemNode) {
            throw new TypeError(
            "FileSystemNode is abstract; instantiate FileNode or DirectoryNode",
            );
        }

        this.id = FileSystemNode._nextId++;

        this.name = name;
        this.parent = parent;

        this.createdAt = Date.now();
        this.modifiedAt = this.createdAt;
        this.accessedAt = this.createdAt;

        this.permissions = {
            read=true,
            write=true,
            execute=true,
            ...(options.permissions || {})
        }


        this.metaData = options.metaData || {};

        this.size = options.size || 0;

    }


    getPath(){
        if(this.parent==null){
            return "/" + this.name;
        }

        const parentPath = this.parent.getPath();
        return parentPath === '/' ? '/' + this.name : parentPath + '/' + this.name;
    }

    getAbsolutePath(){
        return this.getPath();
    }

    rename(newName) {
        if (typeof newName !== 'string' || newName.includes('/')) {
        throw new Error('Invalid name: cannot contain path separators');
        }
        this.name = newName;
        this.modifiedAt = Date.now();
    }

    access(){
        this.accessedAt = Date.now();
    }

    modify(){
        this.modifiedAt = Date.now();
    }

     /**
   * Check if this node is a directory.
   */
    isDirectory() {
        return this instanceof DirectoryNode;
    }

    /**
     * Check if this node is a file.
     */
    isFile() {
        return this instanceof FileNode;
    }

    toJson(){
        return {
            id: this.id,
            name: this.name,
            parentId: this.parent ? this.parent.id : null,
            createdAt: this.createdAt,
            modifiedAt: this.modifiedAt,
            accessedAt: this.accessedAt,
            permissions: this.permissions,
            metadata: this.metadata,
            type: this.isDirectory() ? 'directory' : 'file'
        };
    }




}
