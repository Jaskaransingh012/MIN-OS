export default class WindowRenderer {
  static render(state, contentElement) {
    const wrapper = document.createElement("div");

    wrapper.className =
      "window-wrapper absolute flex flex-col rounded-lg overflow-hidden shadow-2xl border border-amber-500/20 bg-[#0d0e12]";

    wrapper.style.left = state.x + "px";
    wrapper.style.top = state.y + "px";
    wrapper.style.width = state.width + "px";
    wrapper.style.height = state.height + "px";
    wrapper.style.zIndex = state.zIndex;
    wrapper.dataset.windowId = state.id;

    const titleBar = document.createElement("div");
    titleBar.className =
      "title-bar flex items-center justify-between px-3 py-2 bg-[#1a1b20] border-b border-amber-500/10 cursor-move select-none";
    titleBar.innerHTML = `
      <span class="text-sm font-mono text-amber-400/80">${state.title}</span>
      <div class="flex items-center gap-1.5">
        <button class="window-btn-minimize w-3 h-3 rounded-full bg-amber-500/20 hover:bg-amber-500/40 transition-colors" title="Minimize"></button>
        <button class="window-btn-maximize w-3 h-3 rounded-full bg-amber-500/20 hover:bg-amber-500/40 transition-colors" title="Maximize"></button>
        <button class="window-btn-close w-3 h-3 rounded-full bg-red-500/30 hover:bg-red-500/60 transition-colors" title="Close"></button>
      </div>
    `;
    wrapper.appendChild(titleBar);

    const content = document.createElement("div");
    content.className = "window-content flex-1 overflow-auto p-2 text-gray-300";
    if (contentElement) {
      content.appendChild(contentElement);
    }
    wrapper.appendChild(content);

    // Resize handle (bottom-right)
    const resizeHandle = document.createElement("div");
    resizeHandle.className =
      "resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize";
    resizeHandle.innerHTML = `
      <svg class="absolute bottom-0.5 right-0.5 w-3 h-3 text-amber-500/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 22L2 22M22 22L22 2M22 22L2 2" />
      </svg>
    `;
    wrapper.appendChild(resizeHandle);

    return wrapper;
  }

  static updatePosition(wrapper, state) {
    wrapper.style.left = state.x + "px";
    wrapper.style.top = state.y + "px";
  }

  static updateSize(wrapper, state) {
    wrapper.style.width = state.width + "px";
    wrapper.style.height = state.height + "px";
  }

  static updateZIndex(wrapper, state) {
    wrapper.style.zIndex = state.zIndex;
  }

  static setMinimized(wrapper, minimized) {
    if (minimized) {
      wrapper.style.display = "none";
    } else {
      wrapper.style.display = "flex";
    }
  }
}
