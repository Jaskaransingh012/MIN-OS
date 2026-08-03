export default class Shell{

    constructor(kernel, commandRegistry){
        this.kernel = kernel;
        this.commandRegistry = commandRegistry;
    }

    async init(){

        

    }

    async execute(input){

        if(!input || input.trim() == '') return;

        const parts = input.trim().split(/\s+/);
        const cmd = parts[0];
        const args = parts.slice(1);

        const entry = this.commandRegistry.get(cmd);

        if(!entry){

            this.output(`Command Not Found: ${cmd}`);
            return;
        }

        entry.execute(this.kernel ,args);

    }

}
