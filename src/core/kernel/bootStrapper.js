import Desktop from "../../desktop/Desktop.js";
import BootScreen from "../../ui/windows/bootScreen.js";
import StorageFactory from "../storage/StorageFactory.js";
import FileSystem from "../filesystem/FileSystem.js";

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
    await this.initializeCore();
    await this.initializeDesktop();
    await this.initializeApplications();
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

    const storage = this.kernel.get("storage");
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

  async initializeCore() {
    this.boot.setStatus("Starting Core Services");
    this.boot.addLog("Window Manager");
    this.boot.addLog("Process Manager");
    this.boot.addLog("App Manager");
    this.boot.setProgress(60);
    await this.sleep();
  }

  async initializeDesktop() {
    this.boot.setStatus("Loading Desktop");
    const desktop = new Desktop();
    this.kernel.register("desktop", desktop);
    this.boot.addLog("Desktop Ready");
    this.boot.setProgress(80);
    await this.sleep();
    desktop.mount();
  }

  async initializeApplications() {
    this.boot.setStatus("Registering Applications");
    this.boot.addLog("Terminal");
    this.boot.addLog("Browser");
    this.boot.addLog("File Explorer");
    this.boot.setProgress(95);
    await this.sleep();
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
