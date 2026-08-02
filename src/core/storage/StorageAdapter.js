// StorageAdapter.js


/*

======

SO THIS IS KIND OF INTERFACE

====

*/




export class StorageAdapter {


  async init() {
    throw new Error('init() must be implemented by subclass');
  }

  async setItem(key, value) {
    throw new Error('setItem() must be implemented');
  }

  async getItem(key) {
    throw new Error('getItem() must be implemented');
  }


  async removeItem(key) {
    throw new Error('removeItem() must be implemented');
  }


  async clear() {
    throw new Error('clear() must be implemented');
  }


  async keys() {
    throw new Error('keys() must be implemented');
  }

  async length() {
    throw new Error('length() must be implemented');
  }
}
