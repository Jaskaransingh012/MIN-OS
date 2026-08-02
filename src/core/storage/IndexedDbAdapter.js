// IndexedDBAdapter.js
import { StorageAdapter } from './StorageAdapter.js';
import { openDB } from '../../../node_modules/idb/build/index.js';

export class IndexedDBAdapter extends StorageAdapter {
  constructor(dbName = 'MiniOSDB', storeName = 'os-store', version = 1) {
    super();
    this.dbName = dbName;
    this.storeName = storeName;
    this.version = version;
    this.db = null;
  }

  async init() {
    this.db = await openDB(this.dbName, this.version, {
      upgrade: function(db, oldVersion, newVersion, transaction) {
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      }.bind(this),
    });
    return this;
  }

  async setItem(key, value) {
    const data = { id: key, value: JSON.stringify(value) };
    // Use the shortcut method - cleaner and handles transaction lifecycle
    await this.db.put(this.storeName, data);
  }

  async getItem(key) {
    const result = await this.db.get(this.storeName, key);
    if (!result) return null;
    return JSON.parse(result.value);
  }

  async removeItem(key) {
    await this.db.delete(this.storeName, key);
  }

  async clear() {
    await this.db.clear(this.storeName);
  }

  async keys() {
    return await this.db.getAllKeys(this.storeName);
  }

  async length() {
    return await this.db.count(this.storeName);
  }
}
