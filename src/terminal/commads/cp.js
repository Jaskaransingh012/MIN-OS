export default class CopyCommand{

    constructor(kernel){

        this.fileSystem = kernel.getService("fileSystem");

    }

    async _execute(args){
        try{
            if(args.length<2) throw new Error("Require copy source as well as the destination source")

            const currentPath = this.fileSystem.path;
            const sourceFilePath = currentPath + '/' + args[0];
            const copyFile = await this.fileSystem.copyFile(sourceFilePath, args[1]);
            return "File successfully copied at destination" + args[1];
        }
        catch(error){
            return error.message;
        }

    }

}
