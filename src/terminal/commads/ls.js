export default class LsCommand{

    constructor(kernel){

        this.kernel = kernel;
        this.fileSystem = this.kernel.getService("fileSystem");

    }

    async _execute(args){

        let childrens;
        if(args.length ==0){
            childrens = await this.fileSystem.getChildren(this.fileSystem.path);
        }
        const names = await Array.from(childrens, obj => obj.name).join(" ");

        return names;

    }

}
