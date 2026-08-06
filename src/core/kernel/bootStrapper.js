import Desktop from "../../desktop/Desktop.js";
import BootScreen from "../../ui/windows/bootScreen.js";
import StorageFactory from "../storage/StorageFactory.js";
import FileSystem from "../../filesystem/services/FileSystem.js";
import CommandRegistry from "../../terminal/utils/commandRegistry.js";
import WindowManager from "../window-manager/WindowManager.js";
import AppRegistry from "../app-manager/AppRegistry.js";
import AppManager from "../app-manager/AppManager.js";
import Shell from "../../terminal/shell/Shell.js";

export default class Bootstrapper {
  constructor(kernel) {
    this.kernel = kernel;
    this.boot = new BootScreen();
    this.fileSystem = null;
  }

  async bootSystem() {
    await this.initialize();
    await this.loadStorage();
    await this.restoreFileSystem();   // now creates default directories


    await this.initializeWindowManager();
    await this.initializeApplications();
    await this.initializeDesktop();

    await this.initializeShell();


    await this.restoreSession();
    await this.finish();
  }

  async initialize() {
    this.boot.mount();
    this.boot.setStatus("Initializing The JK Kernel");
    this.boot.addLog("Kernel Started");
    this.boot.setProgress(10);
    await this.sleep();
  }

  async loadStorage() {
    this.boot.setStatus("Loading IndexedDB");
    const storage = await StorageFactory.create("indexedDB", {
      dbName: "JK_OS",
      storeName: "FileStorage",
      version: 1
    });
    this.boot.addLog("IndexedDB Connected");
    this.kernel.register("storage", storage);
    this.boot.setProgress(25);
    await this.sleep();
  }

  async restoreFileSystem() {
    this.boot.setStatus("Restoring File System");

    const storage = this.kernel.getService("storage");
    if (!storage) {
      throw new Error("Storage adapter not available");
    }

    // Create and initialize the file system
    this.fileSystem = new FileSystem(storage);
    await this.fileSystem.init();

    // Define default directories to create under root (if missing)
    const defaultDirs = ['Documents', 'Desktop', 'Downloads', 'Pictures', 'Music', 'Videos'];

    // Create them one by one (skip if already exist)
    for (const dirName of defaultDirs) {
      try {
        // Check if it already exists under root
        const root = this.fileSystem.root;
        if (!root.hasChild(dirName)) {
          await this.fileSystem.createDirectory(dirName, '/');
          this.boot.addLog(`Created default directory: /${dirName}`);
        }
      } catch (err) {
        // In case of error (e.g., permissions), log but continue
        console.warn(`Could not create /${dirName}:`, err);
      }
    }

    // Optionally, set current working directory to /Desktop (if it exists)
    try {
      await this.fileSystem.changeDirectory('/Desktop');
    } catch (e) {
      // If Desktop doesn't exist (should not), fallback to root
      await this.fileSystem.changeDirectory('/');
    }

    // Register the file system instance with the kernel
    this.kernel.register("fileSystem", this.fileSystem);

    this.boot.addLog("Filesystem Restored with default directories");
    this.boot.setProgress(40);
    await this.sleep();
  }



  async initializeShell(){

    const commandRegistry = new CommandRegistry();
    this.kernel.register("commandRegistry", commandRegistry);

    const shell = new Shell(this.kernel);
    await shell.init();
    this.kernel.register("shell", shell);

  }

  async initializeDesktop() {
    this.boot.setStatus("Loading Desktop");
    const windowManager = this.kernel.getService("windowManager");
    const appManager = this.kernel.getService("appManager");
    const desktop = new Desktop(this.kernel);
    this.kernel.register("desktop", desktop);
    this.boot.addLog("Desktop Ready");
    this.boot.setProgress(80);
    await this.sleep();
    desktop.mount();
  }

  async initializeWindowManager(){

    this.boot.setStatus("Loading Window Manager");
    const windowManager = new WindowManager();
    this.kernel.register("windowManager", windowManager);

    this.boot.addLog("Window Manager Ready");
    await this.sleep();

    return windowManager;

  }


  async initializeApplications() {

    this.boot.setStatus("Loading AppRegistry");
    const appRegistry = new AppRegistry();
    this.kernel.register("appRegistry", appRegistry);

    this.boot.addLog("Loaded AppRegistry");

    const windowManager = this.kernel.getService("windowManager")
    console.log("this kernel in intialize app", this.kernel);
    const appManager = new AppManager(this.kernel);

    this.kernel.register("appManager", appManager);

    this.boot.addLog("App Manager Loaded");


    await this.loadApps();

    this.boot.setProgress(95);
    await this.sleep();
  }


  async loadApps(){

    const AppManager = this.kernel.getService("appManager");
    await AppManager.loadApps();

  }

  async restoreSession() {
    this.boot.setStatus("Restoring Previous Session");
    this.boot.addLog("Session Restored");
    this.boot.setProgress(100);
    await this.sleep();
  }

  async finish() {
    this.boot.setStatus("Boot Complete");
    this.boot.addLog("Welcome!");
    await this.sleep(700);
    await this.boot.destroy();
  }

  sleep(ms = 600) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
