import WindowRenderer from './WindowRenderer.js';

export default class Window {
  constructor(state, contentElement) {
    this.state = state;
    this.contentElement = contentElement;
    this.dom = null; // the wrapper element
    this._boundEvents = [];
    this._isDragging = false;
    this._isResizing = false;
    this._dragOffset = { x: 0, y: 0 };
    this._resizeStart = { x: 0, y: 0, w: 0, h: 0 };
    this._maximizedState = null; // save previous state when maximizing
  }

  // Build the DOM and attach event listeners
  render() {
    this.dom = WindowRenderer.render(this.state, this.contentElement);
    this._bindEvents();
    return this.dom;
  }

  // Update UI from state
  update() {
    if (!this.dom) return;
    WindowRenderer.updatePosition(this.dom, this.state);
    WindowRenderer.updateSize(this.dom, this.state);
    WindowRenderer.updateZIndex(this.dom, this.state);
    WindowRenderer.setMinimized(this.dom, this.state.minimized);
  }

  // Bring to front (z-index)
  focus() {
    // z-index will be managed by WindowManager, so we just update state and re-render
    // The manager will call update after changing zIndex.
  }

  // Close (remove from DOM)
  close() {
    if (this.dom && this.dom.parentNode) {
      this.dom.parentNode.removeChild(this.dom);
    }
    this._unbindEvents();
  }

  // Toggle minimize
  toggleMinimize() {
    this.state.minimized = !this.state.minimized;
    this.update();
  }

  // Toggle maximize (store previous geometry)
  toggleMaximize() {
    if (this.state.maximized) {
      // Restore from saved state
      if (this._maximizedState) {
        Object.assign(this.state, this._maximizedState);
        this._maximizedState = null;
        this.state.maximized = false;
      }
    } else {
      // Save current geometry and maximize
      this._maximizedState = { x: this.state.x, y: this.state.y, width: this.state.width, height: this.state.height };
      // Use container size (will be set by manager)
      // We'll let the manager set the size when calling maximize
    }
    this.state.maximized = !this.state.maximized;
    this.update();
  }

  // ----- internal events -----
  _bindEvents() {
    if (!this.dom) return;
    const titleBar = this.dom.querySelector('.title-bar');
    const resizeHandle = this.dom.querySelector('.resize-handle');
    const closeBtn = this.dom.querySelector('.window-btn-close');
    const minBtn = this.dom.querySelector('.window-btn-minimize');
    const maxBtn = this.dom.querySelector('.window-btn-maximize');

    // Focus on click (anywhere on window)
    const focusHandler = (e) => {
      if (this.onFocus) this.onFocus(this);
    };
    this.dom.addEventListener('mousedown', focusHandler);
    this._boundEvents.push({ target: this.dom, event: 'mousedown', handler: focusHandler });

    // Drag on title bar
    const dragStartHandler = (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('button')) return; // don't drag on buttons
      this._startDrag(e);
    };
    titleBar.addEventListener('mousedown', dragStartHandler);
    this._boundEvents.push({ target: titleBar, event: 'mousedown', handler: dragStartHandler });

    // Resize
    const resizeStartHandler = (e) => {
      if (e.button !== 0) return;
      this._startResize(e);
    };
    resizeHandle.addEventListener('mousedown', resizeStartHandler);
    this._boundEvents.push({ target: resizeHandle, event: 'mousedown', handler: resizeStartHandler });

    // Buttons
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); if (this.onClose) this.onClose(this); });
    minBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMinimize(); });
    maxBtn.addEventListener('click', (e) => { e.stopPropagation(); if (this.onMaximize) this.onMaximize(this); });

    // Global mouse move / up for drag & resize
    this._moveHandler = (e) => this._handleMove(e);
    this._upHandler = (e) => this._handleUp(e);
    document.addEventListener('mousemove', this._moveHandler);
    document.addEventListener('mouseup', this._upHandler);
    this._boundEvents.push({ target: document, event: 'mousemove', handler: this._moveHandler });
    this._boundEvents.push({ target: document, event: 'mouseup', handler: this._upHandler });
  }

  _unbindEvents() {
    for (const { target, event, handler } of this._boundEvents) {
      target.removeEventListener(event, handler);
    }
    this._boundEvents = [];
    if (this._moveHandler) document.removeEventListener('mousemove', this._moveHandler);
    if (this._upHandler) document.removeEventListener('mouseup', this._upHandler);
  }

  _startDrag(e) {
    if (this.state.maximized) return;
    this._isDragging = true;
    const rect = this.dom.getBoundingClientRect();
    this._dragOffset.x = e.clientX - rect.left;
    this._dragOffset.y = e.clientY - rect.top;
    this.dom.style.cursor = 'grabbing';
  }

  _startResize(e) {
    if (this.state.maximized) return;
    this._isResizing = true;
    this._resizeStart.x = e.clientX;
    this._resizeStart.y = e.clientY;
    this._resizeStart.w = this.state.width;
    this._resizeStart.h = this.state.height;
    this.dom.style.cursor = 'se-resize';
  }

  _handleMove(e) {
    if (this._isDragging) {
      const parent = this.dom.parentNode;
      const parentRect = parent.getBoundingClientRect();
      let newX = e.clientX - parentRect.left - this._dragOffset.x;
      let newY = e.clientY - parentRect.top - this._dragOffset.y;
      // clamp inside parent
      newX = Math.max(0, Math.min(newX, parentRect.width - this.state.width));
      newY = Math.max(0, Math.min(newY, parentRect.height - this.state.height));
      this.state.x = newX;
      this.state.y = newY;
      WindowRenderer.updatePosition(this.dom, this.state);
    }
    if (this._isResizing) {
      const dx = e.clientX - this._resizeStart.x;
      const dy = e.clientY - this._resizeStart.y;
      let newW = Math.max(200, this._resizeStart.w + dx);
      let newH = Math.max(100, this._resizeStart.h + dy);
      // clamp to parent
      const parent = this.dom.parentNode;
      const parentRect = parent.getBoundingClientRect();
      newW = Math.min(newW, parentRect.width - this.state.x);
      newH = Math.min(newH, parentRect.height - this.state.y);
      this.state.width = newW;
      this.state.height = newH;
      WindowRenderer.updateSize(this.dom, this.state);
    }
  }

  _handleUp(e) {
    if (this._isDragging) {
      this._isDragging = false;
      this.dom.style.cursor = '';
    }
    if (this._isResizing) {
      this._isResizing = false;
      this.dom.style.cursor = '';
    }
  }
}
