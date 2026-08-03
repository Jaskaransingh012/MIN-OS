export default class CommandRegistry{

    constructor(){

        this.commands = new Map();

    }


    register(name , instance) {

        if(typeof name !== 'string' || name.length === 0){
            throw new Error("Command name must be a string and not empty");
        }

        if(typeof instance !== 'object') throw new Error("Type of instance must be class related")

        this.commands.set(name, instance);

    }


    get(name){
        return this.commands.get(name);
    }

    has(name){
        return this.commands.has(name);
    }

    list(){
        return Array.from(this.commands.keys());
    }

    clear(){
        this.commands.clear();
    }

}
