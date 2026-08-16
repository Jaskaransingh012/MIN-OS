export default class CdCommand{

    constructor(kernel){

        this.fileSystem = kernel.getService("fileSystem");

    }

    async _execute(args){
        try{
            console.log("arguments",args);
            await this.fileSystem.changeDirectory(args[0]);
            return "Changed Directory to " + this.fileSystem.currentFolder.name!=''?this.fileSystem.currentFolder.name : "Root";
        }
        catch{
            return "Can not change directory to " + args[0];
        }

    }

}
