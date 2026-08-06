export default class ServiceContainer {
  constructor() {
    this.services = new Map();
  }

  register(name, instance) {
    if (this.services.has(name)) {
      throw new Error(`${name} already registered`);
    }

    this.services.set(name, instance);
  }

  get(name) {
    if (!this.services.has(name)) {
      throw new Error(`${name} not found`);
    }

    return this.services.get(name);
  }

  has(name) {
    return this.services.has(name);
  }

  clear() {
    this.services.clear();
  }

  listService() {return this.services;}
}
