import BaseApp from './BaseApp.js';


export default class AppFactory {
  /**
   * Create an app instance (without a window).
   * @param {string} appId - Registered app ID
   * @param {AppRegistry} registry
   * @param {Object} overrides - Override config values
   * @returns {BaseApp}
   */
  static createApp(appId, registry, overrides = {}) {
    const def = registry.get(appId);
    if (!def) throw new Error(`App "${appId}" not registered.`);
    const { appClass, defaultConfig } = def;
    const config = { ...defaultConfig, ...overrides };
    // Generate a unique instance ID (timestamp + random)
    const id = `${appId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    return new appClass(id, config);
  }

  static createAppWindow(appId, registry, windowManager, windowOverrides = {}, appOverrides = {}) {

  }

}
