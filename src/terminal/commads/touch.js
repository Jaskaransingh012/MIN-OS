
export default class TouchCommand{

    constructor(kernel){

        this.kernel = kernel;
        this.fileSystem = this.kernel.getService("fileSystem");

    }

    async _execute(args){

        try {

            if(args.length == 0 ) throw new Error("State the name of the File");

            const parentFolder = this.fileSystem.currentFolder;

            for(let i = 0; i< args.length; i++){

                if(parentFolder._children.get(args[i])!=null){
                    throw new Error("The File with name "+ args[i] + " already exists");
                }

                this.fileSystem.createFile(args[i], "", {}, parentFolder);

            }

            if(args.length ==1) return "New File created " + args[0];

            return `New Files create ${args.join(" ")}`;


        } catch (error) {

            return error.message;

        }
    }

}
