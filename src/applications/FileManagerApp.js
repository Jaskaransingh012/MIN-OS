import BaseApp from "../core/app-manager/BaseApp.js";

export default class FileManagerApp extends BaseApp {
  constructor(config = {}, kernel) {
    super(
      {
        title: "File Manager",
        id: "file-manager",
        type: "system",
        ...config,
      },
      kernel,
    );
    this.fs = this.kernel.getService("fileSystem");
  }

  createContent() {
    const container = document.createElement("div");
    container.className = "jk-filemanager";

    // ******* TOOLBAR ********** //

    const toolbar = document.createElement("div");
    toolbar.className = "jk-fm-toolbar";
    toolbar.innerHTML = `
      <button id="jk-fm-up" class="jk-fm-btn" title="Go up">⬆</button>
      <button id="jk-fm-home" class="jk-fm-btn" title="Home">🏠</button>
      <button id="jk-fm-refresh" class="jk-fm-btn" title="Refresh">⟳</button>
      <span id="jk-fm-path" class="jk-fm-path-display">/</span>
    `;
    container.appendChild(toolbar);

    /* ============== CONTENT AREA =================*/

    const content = document.createElement("div");
    content.className = "jk-fm-content";
    content.id = "jk-fm-content";
    container.appendChild(content);

    // store rethis.fs
    this._container = container;
    this._contentEl = content;
    this._pathDisplay = container.querySelector("#jk-fm-path");
    // bind events after DOM is ready
    // this._bindEvents();

    // initial render
    this._renderDirectory();

    return container;
  }

  _bindEvents() {

    if (this._eventsBound) return;
    this._eventsBound = true;

    const content = this._contentEl;
    const upBtn = document.getElementById("jk-fm-up");
    const homeBtn = document.getElementById("jk-fm-home");
    const refreshBtn = document.getElementById("jk-fm-refresh");

    // Click on up button
    if (upBtn) {
      upBtn.addEventListener("click", () => {
        console.log("up button clicked");
        this._goUp();
      });
    }

    // Click on home button
    if (homeBtn) {
      homeBtn.addEventListener("click", () => {
        this._goHome();
      });
    }

    // Click on refresh button
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this._renderDirectory();
      });
    }

    // Event delegation for items (double-click)
    content.addEventListener("dblclick", (event) => {
      console.log("doble click working")

      const item = event.target.closest(".jk-fm-item");
      if (!item) return;

      const name = item.dataset.name;
      const type = item.dataset.type;
      const currentPath = this._getCurrentPath();

      if (type === "directory") {
        // Navigate into folder
        const newPath =
          currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;

          console.log("new Path",newPath);
        this._goToPath(newPath);
      } else if (type === "file") {
        // Attempt to open the file (e.g., with default app)
        this._openFile(name);
      }
    });
  }

  _getCurrentPath() {
    return this.fs.path || "/";
  }

  _updatePathDisplay() {
    const path = this._getCurrentPath();
    if (this._pathDisplay) {
      this._pathDisplay.textContent = path;
    }
  }

  /** Render directory contents */
  async _renderDirectory() {
    const path = this._getCurrentPath();
    const content = this._contentEl;

    try {
      // Assume fileSystem.readdir returns an array of { name, type } or similar
      const items = await this.fs.getChildren(path);
      content.innerHTML = ""; // clear

      if (!items || items.length === 0) {
        content.innerHTML = '<div class="jk-fm-empty">Empty directory</div>';
        this._updatePathDisplay();
        return;
      }

      // Sort: directories first, then files
      items.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const item of items) {
        const div = document.createElement("div");
        div.className = "jk-fm-item";
        div.dataset.name = item.name;
        div.dataset.type = item.isDirectory() ? "directory" : "file";

        const icon = item.isDirectory() ? "📁" : "📄";
        div.innerHTML = `${icon} ${item.name}`;
        content.appendChild(div);
      }

      this._updatePathDisplay();
    } catch (error) {
      content.innerHTML = `<div class="jk-fm-error">Error reading directory: ${error.message}</div>`;
    }
  }

  /** Navigate to a specific path */
  async _goToPath(newPath) {
    try {
      await this.fs.changeDirectory(newPath);
      await this._renderDirectory();
    } catch (error) {
      // If navigation fails, stay in current dir and show error
      const content = this._contentEl;
      content.innerHTML = `<div class="jk-fm-error">Cannot access ${newPath}: ${error.message}</div>`;
    }
  }

  /** Go up one directory */
  async _goUp() {
    const current = this._getCurrentPath();
    const parent =
      current === "/"
        ? "/"
        : current.substring(0, current.lastIndexOf("/")) || "/";
    await this._goToPath(parent);
  }

  /** Go to home directory (assume root or user home) */
  async _goHome() {
    // You could define a home path, e.g., '/home/user' or '/'
    await this._goToPath("/");
  }

  /** Open a file (placeholder) */
  _openFile(fileName) {
    // For demonstration: alert or use kernel to open with appropriate app
    alert(`Opening file: ${fileName}`);
    // In a real implementation, you might call kernel.openFile(fileName) or similar.
  }

  // ─── lifecycle overrides (optional) ────────────────────────────
  onOpen() {
    // Refresh when the window opens
    this._renderDirectory();
  }
}
