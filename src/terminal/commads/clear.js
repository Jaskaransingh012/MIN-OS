export default class ClearCommand{

    constructor(){
        this.terminal = null;
    }

    async _execute(args){
        try{
            this.terminal = document.getElementsByClassName("jk-term-output")[0];
            if (!this.terminal) throw new Error("Terminal element not found");

            this.terminal.innerHTML = "";
            return "";

        }
        catch(error){
            return error.message;
        }

    }

}
