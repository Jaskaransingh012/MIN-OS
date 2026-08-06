export default class WindowManager {
  constructor() {
// DOM element where windows are placed (e.g., .desktop-workspace)
    this.windows = [];
    this.activeWindow = null;
    this._zIndexCounter = 1;
    this._boundEvents = [];

    // Ensure container has position: relative
    if (this.container) {
      this.container.style.position = 'relative';
      this.container.style.overflow = 'hidden';
    }
  }

  init(container){

    this.container = container;

  }

  // Add a window instance (already built)
  addWindow(window) {
    // Set z-index
    window.state.zIndex = this._getNextZIndex();
    // Render DOM
    const dom = window.render();
    this.container.appendChild(dom);
    this.windows.push(window);
    // Focus it
    this.focusWindow(window);
    // Update window size if maximized
    if (window.state.maximized) {
      const rect = this.container.getBoundingClientRect();
      window.state.x = 0;
      window.state.y = 0;
      window.state.width = rect.width;
      window.state.height = rect.height;
      window.update();
    }
    return window;
  }

  // Remove a window
  closeWindow(window) {
    const idx = this.windows.indexOf(window);
    if (idx !== -1) {
      this.windows.splice(idx, 1);
      window.close();
      if (this.activeWindow === window) {
        this.activeWindow = null;
        // Focus last window in stack
        if (this.windows.length > 0) {
          this.focusWindow(this.windows[this.windows.length - 1]);
        }
      }
    }
  }

  // Focus a window (bring to front)
  focusWindow(window) {
    if (!window || this.activeWindow === window) return;
    // Update z-index for all windows
    const maxZ = Math.max(...this.windows.map(w => w.state.zIndex), 0);
    window.state.zIndex = maxZ + 1;
    window.update();
    this.activeWindow = window;
    // Update other windows (optional: keep them behind)
  }

  // Get next z-index
  _getNextZIndex() {
    return ++this._zIndexCounter;
  }

  // Destroy: clean up all windows
  destroy() {
    for (const w of this.windows) {
      w.close();
    }
    this.windows = [];
    this.activeWindow = null;
    this._zIndexCounter = 1;
  }
}
