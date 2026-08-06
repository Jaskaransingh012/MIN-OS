export default class BaseApp {
  constructor({ title, id, type = "system" }, kernel=null) {
    this.kernel = kernel;
    this.title = title;
    this.type = type;
    this.icon = "📦";
    this.window = null;
    this._content = null;
    console.log("baseapp", this);
  }

  createContent() {
    const div = document.createElement("div");
    div.className = "p-4 text-gray-300";
    div.textContent = "App content not implemented";
    return div;
  }

  onOpen(){};

  onClose(){};

  onFocus(){};

  onBlur(){};

  getTitle(){return this.title};

  destroy(){
    this._content = null;
    this.window = null;
  }

}
