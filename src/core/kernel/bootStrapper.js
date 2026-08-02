import Desktop from "../../desktop/Desktop.js";
import BootScreen from "../../ui/windows/bootScreen.js";

export default class Bootstrapper{

    constructor(kernel){

        this.kernel = kernel;

        this.boot = new BootScreen();

    }

    async bootSystem(){

        await this.initialize();

        await this.loadStorage();

        await this.restoreFileSystem();

        await this.initializeCore();

        await this.initializeDesktop();

        await this.initializeApplications();

        await this.restoreSession();

        await this.finish();

    }

    async initialize(){

        this.boot.mount();

        this.boot.setStatus("Initializing The JK Kernel");

        this.boot.addLog("Kernel Started");

        this.boot.setProgress(10);

        await this.sleep();

    }

    async loadStorage(){

        this.boot.setStatus("Loading IndexedDB");

        this.boot.addLog("IndexedDB Connected");

        this.boot.setProgress(25);

        await this.sleep();

    }

    async restoreFileSystem(){

        this.boot.setStatus("Loading File System");

        this.boot.addLog("Filesystem Restored");

        this.boot.setProgress(40);

        await this.sleep();

    }

    async initializeCore(){

        this.boot.setStatus("Starting Core Services");

        this.boot.addLog("Window Manager");

        this.boot.addLog("Process Manager");

        this.boot.addLog("App Manager");

        this.boot.setProgress(60);

        await this.sleep();

    }

    async initializeDesktop(){

        this.boot.setStatus("Loading Desktop");

        const desktop = new Desktop();


        this.kernel.register("desktop", desktop);

        this.boot.addLog("Desktop Ready");

        this.boot.setProgress(80);

        await this.sleep();

        desktop.mount();

    }

    async initializeApplications(){

        this.boot.setStatus("Registering Applications");

        this.boot.addLog("Terminal");

        this.boot.addLog("Browser");

        this.boot.addLog("File Explorer");

        this.boot.setProgress(95);

        await this.sleep();

    }

    async restoreSession(){

        this.boot.setStatus("Restoring Previous Session");

        this.boot.addLog("Session Restored");

        this.boot.setProgress(100);

        await this.sleep();

    }

    async finish(){

        this.boot.setStatus("Boot Complete");

        this.boot.addLog("Welcome!");

        await this.sleep(700);

        await this.boot.destroy();

    }

    sleep(ms=600){

        return new Promise(resolve=>setTimeout(resolve,ms));

    }

}
