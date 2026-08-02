import { IndexedDBAdapter } from "./IndexedDbAdapter.js";
import LocalStorageAdapter from "./LocalStorageAdapter.js";

export default class StorageFactory {
  /**
   * Create a storage adapter.
   * @param {string} type - 'localStorage', 'indexedDB', or 'auto'
   * @param {object} options - additional config (dbName, storeName, etc.)
   * @returns {Promise<StorageAdapter>} - initialized adapter
   */

  static async create(type = "auto", options = {}) {
    let adapter;

    if (type == "auto") {
      try {
        if (typeof indexedDB !== undefined) {
          adapter = new IndexedDBAdapter(
            options.dbName,
            options.storeName,
            options.version,
          );
          await adapter.init();
          return adapter;
        }
      } catch (error) {
        console.warn(
          "IndexedDb is not available, falling back to Local Storage",
        );
      }

      if (typeof localStorage !== "undefined") {
        adapter = new LocalStorageAdapter();
        await adapter.init();
        return adapter;
      }
      throw new Error("No storage backend available");
    }

    switch(type){

        case 'localStorage':
            adapter = new LocalStorageAdapter();
            await adapter.init();
            return adapter;

        case 'indexedDB':
            adapter = new IndexedDBAdapter();
            await adapter.init();
            return adapter;

        default:
            throw new Error("Unknown Storage Type " + type);
    }

  }
}
