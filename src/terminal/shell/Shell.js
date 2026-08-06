import CdCommand from "../commads/cd.js";
import LsCommand from "../commads/ls.js";
import MkdirCommand from "../commads/mkdir.js";

export default class Shell{

    constructor(kernel){
        this.kernel = kernel;
        this.commandRegistry = kernel.getService("commandRegistry");
    }

    async init(){

        this.commandRegistry.register("ls",new LsCommand(this.kernel));
        this.commandRegistry.register("cd",new CdCommand(this.kernel));
        this.commandRegistry.register("mkdir", new MkdirCommand(this.kernel));



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

        const output = entry._execute(args);
        return output;

    }




}
