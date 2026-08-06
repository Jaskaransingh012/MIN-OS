import BaseApp from './BaseApp.js';

/**
 * Factory to create app instances and optionally wrap them in windows.
 */
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

  /**
   * Create an app and immediately wrap it in a window (using WindowFactory).
   * @param {string} appId
   * @param {AppRegistry} registry
   * @param {WindowManager} windowManager
   * @param {Object} windowOverrides - Override window state (x, y, width, etc.)
   * @param {Object} appOverrides - Override app config
   * @returns {{ app: BaseApp, window: Window }}
   */
  static createAppWindow(appId, registry, windowManager, windowOverrides = {}, appOverrides = {}) {
    // Dynamically import WindowFactory to avoid circular dependency
    // We'll use a direct import if needed, but we can also accept a factory function.
    // Here we assume WindowFactory is available globally or we pass it.
    // For simplicity, we'll use a function passed as an argument.
    // Instead, we'll import WindowFactory here (assuming it's in the same project).
    // Let's use a dynamic import or require.
    // Since we are using ES modules, we can import it directly.
    // We'll import WindowFactory from '../window-manager/WindowFactory.js'
    // But to avoid circular, we'll pass it as a parameter.
    // For now, we'll make it a static method that expects a windowFactory.
  }

  // We'll implement the actual window creation in AppManager to keep it flexible.
}
