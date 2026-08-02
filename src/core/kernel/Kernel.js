import ServiceContainer from "./serviceContainer.js";
import Bootstrapper from "./bootStrapper.js";

export default class Kernel{

    constructor(){

        this.container = new ServiceContainer();

        this.bootstrapper = new Bootstrapper(this);

    }

    async start(){

        await this.bootstrapper.bootSystem();

    }

    register(name,service){

        this.container.register(name,service);

    }

    getService(name){

        return this.container.get(name);

    }

}
