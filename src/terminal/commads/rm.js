
export default class RemoveFileCommand{

    constructor(kernel){

        this.fileSystem = kernel.getService("fileSystem");

    }

    async _execute(args){

        try {

            if(args.length == 0 ) throw new Error("State the name of the Files you want to remove");

            const parentFolder = this.fileSystem.currentFolder;

            for(let i = 0; i< args.length; i++){


                if(parentFolder._children.get(args[i])==null){
                    throw new Error("The File with name "+ args[i] + " does not exists");
                }

                this.fileSystem.deleteFile(args[i]);

            }

            if(args.length ==1) return "File deleted " + args[0];

            return `Files deleted ${args.join(" ")}`;


        } catch (error) {

            return error.message;

        }
    }

}
