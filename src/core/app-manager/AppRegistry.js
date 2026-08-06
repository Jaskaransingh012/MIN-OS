/**
 * Registry of available app types.
 * Each entry maps an appId to a class and default config.
 */
export default class AppRegistry {
  constructor() {
    this._apps = new Map();
  }

  /**
   * Register an app type.
   * @param {string} appId - Unique identifier (e.g., 'terminal')
   * @param {typeof BaseApp} appClass - The app class (must extend BaseApp)
   * @param {Object} defaultConfig - Default config for new instances
   */
  
  register(appId, appClass, defaultConfig = {}) {
    if (this._apps.has(appId)) {
      console.warn(`App "${appId}" already registered, overwriting.`);
    }
    this._apps.set(appId, { appClass, defaultConfig });
  }

  /**
   * Get the registered app definition.
   * @returns {{ appClass: typeof BaseApp, defaultConfig: Object } | null}
   */
  get(appId) {
    return this._apps.get(appId) || null;
  }

  /**
   * Check if an app is registered.
   */
  has(appId) {
    return this._apps.has(appId);
  }

  /**
   * Get all registered app IDs.
   */
  getAllIds() {
    return Array.from(this._apps.keys());
  }
}
