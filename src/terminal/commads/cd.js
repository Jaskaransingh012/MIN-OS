export default class CdCommand{

    constructor(kernel){

        this.kernel = kernel;
        this.fileSystem = this.kernel.getService("fileSystem");

    }

    async _execute(args){

        console.log("arguments",args);
        this.fileSystem.changeDirectory(args[0]);
        return "Changed Directory to " + this.fileSystem.currentFolder.name!=''?this.fileSystem.currentFolder.name : "Root";
    }

}
