import CatCommand from "../commads/cat.js";
import CdCommand from "../commads/cd.js";
import ClearCommand from "../commads/clear.js";
import CopyCommand from "../commads/cp.js";
import EchoCommand from "../commads/echo.js";
import LsCommand from "../commads/ls.js";
import MkdirCommand from "../commads/mkdir.js";
import MoveCommand from "../commads/mv.js";
import RemoveFileCommand from "../commads/rm.js";
import TouchCommand from "../commads/touch.js";
import VimEditorCommand from "../commads/vim.js";

export default class Shell{

    constructor(kernel){
        this.kernel = kernel;
        this.commandRegistry = kernel.getService("commandRegistry");
    }

    async init(){

        this.commandRegistry.register("ls",new LsCommand(this.kernel));
        this.commandRegistry.register("cd",new CdCommand(this.kernel));
        this.commandRegistry.register("mkdir", new MkdirCommand(this.kernel));
        this.commandRegistry.register("touch", new TouchCommand(this.kernel));
        this.commandRegistry.register("echo", new EchoCommand(this.kernel));
        this.commandRegistry.register("vim", new VimEditorCommand(this.kernel));
        this.commandRegistry.register("cat", new CatCommand(this.kernel));
        this.commandRegistry.register("clear", new ClearCommand());
        this.commandRegistry.register("cp", new CopyCommand(this.kernel));
        this.commandRegistry.register("mv", new MoveCommand(this.kernel));
        this.commandRegistry.register("rm", new RemoveFileCommand(this.kernel));


    }

    async execute(input){

        if(!input || input.trim() == '') return;

        const parts = input.trim().split(/\s+/);
        const cmd = parts[0];
        const args = parts.slice(1);

        const entry = this.commandRegistry.get(cmd);

        let output;

        if(!entry){

            output = `Command Not Found: ${cmd}`;
        }
        else{

            output = entry._execute(args);
        }

        return output;

    }




}
