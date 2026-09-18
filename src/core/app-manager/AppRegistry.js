
export default class AppRegistry {
  constructor() {
    this._apps = new Map();
  }



  register(appId, appClass, defaultConfig = {}) {
    if (this._apps.has(appId)) {
      console.warn(`App "${appId}" already registered, overwriting.`);
    }
    this._apps.set(appId, { appClass, defaultConfig });
  }


  get(appId) {
    return this._apps.get(appId) || null;
  }


  has(appId) {
    return this._apps.has(appId);
  }


  getAllIds() {
    return Array.from(this._apps.keys());
  }
}
