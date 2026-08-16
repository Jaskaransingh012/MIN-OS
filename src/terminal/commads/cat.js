export default class CatCommand{

    constructor(kernel){

        this.fileSystem = kernel.getService("fileSystem");

    }

    async _execute(args){
        try{
            console.log("arguments",args);
            const currentPath = this.fileSystem.path;
            const filePath = currentPath + '/' + args[0];

            const fileContent = await this.fileSystem.read(filePath);

            return fileContent;
        }
        catch(error){
            return error.message;
        }

    }

}
