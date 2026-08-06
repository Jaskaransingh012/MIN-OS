export default class LsCommand{

    constructor(kernel){

        this.kernel = kernel;
        this.fileSystem = this.kernel.getService("fileSystem");

    }

    async _execute(args){

        return Array.from(this.fileSystem.currentFolder._children.values(), obj => obj.name).join(" ");


    }

}
