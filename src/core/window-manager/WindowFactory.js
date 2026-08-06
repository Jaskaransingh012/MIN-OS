import Window from "./Window.js";
import WindowState from "./WindowState.js";

// Factory to create windows with common content types
export default class WindowFactory {



  /**
   * Create a window with given content and add it to the manager (optionally).
   * @param {string} title - Window title
   * @param {HTMLElement} content - DOM element to place inside
   * @param {WindowManager} windowManager - Optional, if provided the window will be added automatically.
   * @param {Object} windowStateOverrides - Override x, y, width, height, etc.
   * @returns {Window} - The window instance
   */
  static createWindowFromContent(
    title,
    content,
    windowManager,
    windowStateOverrides = {},
  ) {
    const id =
      "win-" + Date.now() + "-" + Math.random().toString(36).slice(2, 5);
    const defaultState = {
      x: 120 + Math.random() * 40,
      y: 80 + Math.random() * 40,
      width: 600,
      height: 400,
      zIndex: 1,
      minimized: false,
      maximized: false,
    };

    const state = new WindowState({
      id,
      title,
      ...defaultState,
      ...windowStateOverrides,
    });

    console.log("content", content);

    const win = new Window(state, content);
    // Set callbacks (can be overridden later)
    win.onClose = () => {};
    win.onFocus = () => {};
    win.onMaximize = () => {
      // default maximize toggle handled in Window, but we can override
    };
    if (windowManager) {
      // Optionally add to manager, but we'll let the caller add it.
      // Actually, we might want to return the window and let AppManager add it.
      // So we don't auto-add here.
    }
    return win;
  }
}
