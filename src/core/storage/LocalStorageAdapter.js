import { StorageAdapter } from "./StorageAdapter.js";

export default class LocalStorageAdapter extends StorageAdapter {
  async init() {
    return this;
  }

  async setItem(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      throw new Error(`Local Storage setitem failed: ${error.message}`);
    }
  }

  async getItem(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return null;
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`Local Storage getItem failed: ${error.message}`);
    }
  }

  async removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      throw new Error(`Local Storage removeItem failed: ${error.message}`);
    }
  }

  async clear() {
    try {
      localStorage.clear();
    } catch (error) {
      throw new Error(`Local Storage clear failed: ${error.message}`);
    }
  }

  async keys() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }
      return keys;
    } catch (err) {
      throw new Error(`LocalStorage keys failed: ${err.message}`);
    }
  }

  async length() {
    try {
      return localStorage.length;
    } catch (err) {
      throw new Error(`LocalStorage length failed: ${err.message}`);
    }
  }
}
