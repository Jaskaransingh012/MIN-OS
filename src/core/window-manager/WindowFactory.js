import Window from './Window.js';
import WindowState from './WindowState.js';

// Factory to create windows with common content types
export default class WindowFactory {
  static createTerminal(manager) {
    const id = 'terminal-' + Date.now();
    const state = new WindowState({
      id,
      title: 'Terminal',
      x: 120,
      y: 80,
      width: 700,
      height: 450,
      zIndex: manager._getNextZIndex(),
    });
    // Create content: a simple terminal mock (can be replaced with actual terminal)
    const content = document.createElement('div');
    content.className = 'font-mono text-sm text-gray-300 p-2 bg-black/30 rounded';
    content.innerHTML = `
      <div class="text-amber-400">JK OS Terminal v1.0</div>
      <div class="text-gray-500">Type your commands here...</div>
      <div class="mt-2 flex items-center">
        <span class="text-amber-400">$</span>
        <span class="ml-2 cursor-blink inline-block w-2 h-4 bg-amber-400/50 animate-pulse"></span>
      </div>
    `;
    const win = new Window(state, content);
    win.onClose = () => manager.closeWindow(win);
    win.onFocus = (w) => manager.focusWindow(w);
    win.onMaximize = (w) => {
      // Toggle maximize: manager will handle resizing
      w.toggleMaximize();
      // If maximized, we need to set size to container
      if (w.state.maximized) {
        const container = manager.container;
        const rect = container.getBoundingClientRect();
        w.state.x = 0;
        w.state.y = 0;
        w.state.width = rect.width;
        w.state.height = rect.height;
        w.update();
      } else {
        // restore from saved state (already done in toggleMaximize)
        w.update();
      }
    };
    return win;
  }

  static createAbout(manager) {
    const id = 'about-' + Date.now();
    const state = new WindowState({
      id,
      title: 'About JK OS',
      x: 200,
      y: 150,
      width: 400,
      height: 300,
      zIndex: manager._getNextZIndex(),
    });
    const content = document.createElement('div');
    content.className = 'p-4 text-gray-300';
    content.innerHTML = `
      <div class="text-2xl text-amber-400 font-bold">JK OS</div>
      <div class="text-sm text-gray-500">Version 1.0.0</div>
      <div class="mt-4 text-sm">A custom desktop environment built with vanilla JS and Tailwind.</div>
      <div class="mt-2 text-xs text-gray-600">© 2026 JK Labs</div>
    `;
    const win = new Window(state, content);
    win.onClose = () => manager.closeWindow(win);
    win.onFocus = (w) => manager.focusWindow(w);
    win.onMaximize = (w) => {
      w.toggleMaximize();
      if (w.state.maximized) {
        const container = manager.container;
        const rect = container.getBoundingClientRect();
        w.state.x = 0;
        w.state.y = 0;
        w.state.width = rect.width;
        w.state.height = rect.height;
        w.update();
      } else {
        w.update();
      }
    };
    return win;
  }
}
