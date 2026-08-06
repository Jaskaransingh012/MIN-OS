import AppRegistry from './AppRegistry.js';
import WindowFactory from '../window-manager/WindowFactory.js'; // adjust path
import TerminalApp from '../../applications/TerminalApp.js';

/**
 * Manages running app instances, window creation, and lifecycle.
 */
export default class AppManager {
  /**
   * @param {WindowManager} windowManager
   * @param {AppRegistry} registry
   */
  constructor(kernel) {
    this.kernel = kernel;
    this.windowManager = kernel.getService('windowManager');
    this.registry = kernel.getService('appRegistry');
    this._instances = new Map(); // instanceId -> { app, window }
    this._appIdToInstances = new Map(); // appId -> Set of instanceIds
  }

  /**
   * Open an app (launch a new instance).
   * @param {string} appId - Registered app ID
   * @param {Object} appConfig - Override app config (title, etc.)
   * @param {Object} windowConfig - Override window state (x, y, width, height)
   * @param {boolean} allowMultiple - If false, focus existing instance instead of creating new.
   * @returns {BaseApp} The app instance
   */
  openApp(appId, appConfig = {}, windowConfig = {}, allowMultiple = true) {
    if (!allowMultiple) {
      // Check if an instance already exists
      const existing = this.getFirstInstance(appId);
      if (existing) {
        this.focusApp(existing);
        return existing;
      }
    }

    // Create app instance
    const def = this.registry.get(appId);
    if (!def) throw new Error(`App "${appId}" not registered.`);

    const { appClass, defaultConfig } = def;
    const config = { ...defaultConfig, ...appConfig };
    const id = `${appId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    console.log("def in open app", def)
    const app = new appClass(defaultConfig, this.kernel);

    // Create content
    const content = app.createContent();

    // Create window
    const win = WindowFactory.createWindowFromContent(
      app.getTitle(),
      content,
      this.windowManager,
      { ...windowConfig, zIndex: this.windowManager._getNextZIndex() }
    );


    console.log("window",win.contentElement);

    // Store relationship
    app.window = win;
    this._instances.set(id, { app, window: win });
    if (!this._appIdToInstances.has(appId)) {
      this._appIdToInstances.set(appId, new Set());
    }
    this._appIdToInstances.get(appId).add(id);

    // Wire up window events
    const originalClose = win.onClose;
    win.onClose = (w) => {
      this.closeApp(id);
      if (originalClose) originalClose(w);
    };
    win.onFocus = (w) => {
      app.onFocus();
      // focus manager handles z-index
    };
    win.onMaximize = (w) => {
      // default behavior: toggle maximize (handled in Window)
      // We can add custom logic here if needed.
    };

    // Add window to manager
    this.windowManager.addWindow(win);

    // Call app onOpen
    app.onOpen();

    app._bindEvents();

    return app;
  }

  /**
   * Close a specific app instance.
   * @param {string} instanceId
   */
  closeApp(instanceId) {
    const entry = this._instances.get(instanceId);
    if (!entry) return;
    const { app, window: win } = entry;
    // Call app onClose
    app.onClose();
    // Remove window from manager (closes DOM)
    this.windowManager.closeWindow(win);
    // Clean up
    app.destroy();
    this._instances.delete(instanceId);
    // Remove from appId map
    const appId = app.id.split('-')[0]; // hacky, but we can store appId in app
    const set = this._appIdToInstances.get(appId);
    if (set) {
      set.delete(instanceId);
      if (set.size === 0) this._appIdToInstances.delete(appId);
    }
  }

  /**
   * Focus an app instance (bring its window to front).
   * @param {BaseApp} app
   */
  focusApp(app) {
    if (!app.window) return;
    this.windowManager.focusWindow(app.window);
  }

  /**
   * Get the first running instance of an appId.
   */
  getFirstInstance(appId) {
    const ids = this._appIdToInstances.get(appId);
    if (!ids || ids.size === 0) return null;
    const firstId = ids.values().next().value;
    const entry = this._instances.get(firstId);
    return entry ? entry.app : null;
  }

  /**
   * Get all running instances of an appId.
   */
  getInstances(appId) {
    const ids = this._appIdToInstances.get(appId) || new Set();
    const result = [];
    for (const id of ids) {
      const entry = this._instances.get(id);
      if (entry) result.push(entry.app);
    }
    return result;
  }

  /**
   * Close all instances of an appId.
   */
  closeAll(appId) {
    const instances = this.getInstances(appId);
    for (const app of instances) {
      this.closeApp(app.id);
    }
  }

  /**
   * Destroy the manager: close all apps.
   */
  destroy() {
    const allIds = Array.from(this._instances.keys());
    for (const id of allIds) {
      this.closeApp(id);
    }
    this._instances.clear();
    this._appIdToInstances.clear();
  }

  async loadApps(){
    this.registry.register('terminal', TerminalApp, {
      title: 'Terminal',
      icon: '⌨'
    })
  }
}
