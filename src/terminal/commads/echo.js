
export default class EchoCommand{

    constructor(kernel){

        this.kernel = kernel;
        this.fileSystem = this.kernel.getService("fileSystem");

    }

    async _execute(args){

        try {

            const content = args.join(" ");

            return content;


        } catch (error) {

            return error.message;

        }
    }

}
