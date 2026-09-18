import BaseApp from "../core/app-manager/BaseApp.js";

export default class TextEditorApp extends BaseApp {
  constructor(config, kernel = null) {
    super(config, kernel);
    this.title = "Text Editor";
    this.icon = "📝";
    this.currentFile = config.path;
    this.isDirty = false;
    this.fileSystem = kernel?.getService("fileSystem");
    this.shell = kernel?.getService("shell");
    this.undoStack = [];
    this.redoStack = [];

    this.content = null;

    if(this.currentFile != null)
    {
      this.content = this.fileSystem.read(this.currentFile)
      console.log("content", this.content)
    }
  }

  createContent() {
    const container = document.createElement("div");
    container.className = "jk-text-editor";

    // ── Menu Bar ──
    const menuBar = document.createElement("div");
    menuBar.className = "jk-editor-menu-bar";
    menuBar.innerHTML = `
      <div class="jk-menu-group">
        <button class="jk-menu-btn" id="jk-editor-new" title="Ctrl+N">New</button>
        <button class="jk-menu-btn" id="jk-editor-open" title="Ctrl+O">Open</button>
        <button class="jk-menu-btn" id="jk-editor-save" title="Ctrl+S">Save</button>
        <button class="jk-menu-btn" id="jk-editor-save-as" title="Ctrl+Shift+S">Save As</button>
      </div>
      <div class="jk-menu-group">
        <button class="jk-menu-btn" id="jk-editor-undo" title="Ctrl+Z">↶ Undo</button>
        <button class="jk-menu-btn" id="jk-editor-redo" title="Ctrl+Y">↷ Redo</button>
      </div>
      <div class="jk-editor-title" id="jk-editor-file-title">Untitled</div>
    `;
    container.appendChild(menuBar);

    // ── Status Bar ──
    const statusBar = document.createElement("div");
    statusBar.className = "jk-editor-status-bar";
    statusBar.innerHTML = `
      <span id="jk-editor-line-count">Line 1, Col 1</span>
      <span id="jk-editor-file-size">Size: 0 B</span>
      <span id="jk-editor-file-status"></span>
    `;
    container.appendChild(statusBar);

    // ── Editor Area ──
    const editorWrapper = document.createElement("div");
    editorWrapper.className = "jk-editor-wrapper";

    // Line numbers
    const lineNumbers = document.createElement("div");
    lineNumbers.className = "jk-editor-line-numbers";
    lineNumbers.id = "jk-editor-line-numbers";
    editorWrapper.appendChild(lineNumbers);

    // Textarea
    const textarea = document.createElement("textarea");
    textarea.id = "jk-editor-textarea";
    textarea.className = "jk-editor-textarea";
    textarea.spellcheck = false;
    textarea.autofocus = true;
    textarea.value = this.content;
    editorWrapper.appendChild(textarea);

    container.appendChild(editorWrapper);

    // ── Find/Replace Panel ──
    const findPanel = document.createElement("div");
    findPanel.className = "jk-editor-find-panel jk-hidden";
    findPanel.id = "jk-editor-find-panel";
    findPanel.innerHTML = `
      <div class="jk-find-row">
        <input type="text" id="jk-editor-find-input" placeholder="Find..." class="jk-find-input" />
        <button id="jk-editor-find-prev" class="jk-find-btn">↑</button>
        <button id="jk-editor-find-next" class="jk-find-btn">↓</button>
        <button id="jk-editor-find-close" class="jk-find-btn">✕</button>
      </div>
      <div class="jk-find-row">
        <input type="text" id="jk-editor-replace-input" placeholder="Replace..." class="jk-find-input" />
        <button id="jk-editor-replace" class="jk-find-btn">Replace</button>
        <button id="jk-editor-replace-all" class="jk-find-btn">Replace All</button>
      </div>
    `;
    container.appendChild(findPanel);

    this._container = container;
    this._textarea = textarea;
    this._lineNumbers = lineNumbers;
    this._findPanel = findPanel;

    return container;
  }

  _bindEvents() {
    const textarea = this._textarea;
    const lineNumbers = this._lineNumbers;
    const findPanel = this._findPanel;

    // ── Line number sync ──
    const updateLineNumbers = () => {
      const lines = textarea.value.split("\n");
      lineNumbers.innerHTML = lines
        .map((_, i) => `<div class="jk-line-number">${i + 1}</div>`)
        .join("");
    };

    // ── Keyboard shortcuts ──
    textarea.addEventListener("keydown", (e) => {
      // Tab to insert spaces
      if (e.key === "Tab") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value =
          textarea.value.substring(0, start) +
          "  " +
          textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        this.isDirty = true;
        this.updateStatus();
      }

      // Ctrl+S / Cmd+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (this.currentFile) {
          this.saveFile();
        } else {
          this.saveFileAs();
        }
      }

      // Ctrl+Shift+S / Cmd+Shift+S: Save As
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
        e.preventDefault();
        this.saveFileAs();
      }

      // Ctrl+N / Cmd+N: New
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        this.newFile();
      }

      // Ctrl+O / Cmd+O: Open
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        this.openFile();
      }

      // Ctrl+F / Cmd+F: Find
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        this.toggleFindPanel();
      }

      // Ctrl+Z / Cmd+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        this.undo();
      }

      // Ctrl+Y / Cmd+Y: Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        this.redo();
      }
    });

    // ── Input and scroll sync ──
    textarea.addEventListener("input", () => {
      this.isDirty = true;
      updateLineNumbers();
      this.updateStatus();
    });

    textarea.addEventListener("scroll", () => {
      lineNumbers.scrollTop = textarea.scrollTop;
    });

    // ── Menu buttons ──
    document.getElementById("jk-editor-new").addEventListener("click", () =>
      this.newFile()
    );
    document.getElementById("jk-editor-open").addEventListener("click", () =>
      this.openFile()
    );
    document.getElementById("jk-editor-save").addEventListener("click", () => {
      if (this.currentFile) {
        this.saveFile();
      } else {
        this.saveFileAs();
      }
    });
    document.getElementById("jk-editor-save-as").addEventListener("click", () =>
      this.saveFileAs()
    );

    document
      .getElementById("jk-editor-undo")
      .addEventListener("click", () => this.undo());
    document
      .getElementById("jk-editor-redo")
      .addEventListener("click", () => this.redo());

    // ── Find/Replace ──
    document
      .getElementById("jk-editor-find-close")
      .addEventListener("click", () => this.toggleFindPanel());

    document
      .getElementById("jk-editor-find-next")
      .addEventListener("click", () => this.findNext());

    document
      .getElementById("jk-editor-find-prev")
      .addEventListener("click", () => this.findPrev());

    document
      .getElementById("jk-editor-replace")
      .addEventListener("click", () => this.replace());

    document
      .getElementById("jk-editor-replace-all")
      .addEventListener("click", () => this.replaceAll());

    document
      .getElementById("jk-editor-find-input")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.findNext();
      });

    // Initial line numbers
    updateLineNumbers();
  }

  updateStatus() {
    const textarea = this._textarea;
    const lines = textarea.value.split("\n");
    const currentLine =
      textarea.value.substring(0, textarea.selectionStart).split("\n").length;
    const currentCol =
      textarea.selectionStart -
      textarea.value.lastIndexOf("\n", textarea.selectionStart - 1);

    document.getElementById("jk-editor-line-count").textContent = `Line ${currentLine}, Col ${currentCol}`;
    document.getElementById("jk-editor-file-size").textContent = `Size: ${(textarea.value.length / 1024).toFixed(2)} KB`;

    const statusEl = document.getElementById("jk-editor-file-status");
    if (this.isDirty) {
      statusEl.textContent = "● Modified";
      statusEl.style.color = "#ff9800";
    } else {
      statusEl.textContent = "✓ Saved";
      statusEl.style.color = "#4caf50";
    }
  }

  newFile() {
    if (this.isDirty) {
      if (!confirm("Discard unsaved changes?")) return;
    }
    this._textarea.value = "";
    this.currentFile = null;
    this.isDirty = false;
    this.undoStack = [];
    this.redoStack = [];
    this.updateTitle();
    this.updateStatus();
  }

  openFile() {
    const path = prompt("Enter file path to open (e.g., /path/to/file.txt):");
    if (!path) return;

    if (!this.fileSystem) {
      alert("File system service not available");
      return;
    }

    try {
      const content = this.content ? this.content : this.fileSystem.read(path);
      this._textarea.value = content;
      this.currentFile = path;
      this.isDirty = false;
      this.undoStack = [];
      this.redoStack = [];
      this.updateTitle();
      this.updateStatus();
    } catch (error) {
      alert(`Error opening file: ${error.message}`);
      console.error("Open file error:", error);
    }
  }

  async saveFile() {
    if (!this.currentFile) {
      this.saveFileAs();
      return;
    }

    if (!this.fileSystem) {
      alert("File system service not available");
      return;
    }

    try {
      await this.fileSystem.write(this.currentFile, this._textarea.value);
      this.isDirty = false;
      this.updateStatus();
      this.showNotification(`✓ File saved: ${this.currentFile}`);
    } catch (error) {
      alert(`Error saving file: ${error.message}`);
      console.error("Save file error:", error);
    }
  }

  async saveFileAs() {
    const path = prompt("Enter file path (e.g., /path/to/newfile.txt):");
    if (!path) return;

    if (!this.fileSystem) {
      alert("File system service not available");
      return;
    }

    try {
      const fileName = path.split("/").pop();
      const dirPath = path.substring(0, path.lastIndexOf("/")) || "/";

      // Create file in the file system
      await this.fileSystem.createFile(fileName, this._textarea.value, {}, dirPath);

      this.currentFile = path;
      this.isDirty = false;
      this.undoStack = [];
      this.redoStack = [];
      this.updateTitle();
      this.updateStatus();
      this.showNotification(`✓ File saved: ${path}`);
    } catch (error) {
      alert(`Error saving file: ${error.message}`);
      console.error("Save as error:", error);
    }
  }

  toggleFindPanel() {
    this._findPanel.classList.toggle("jk-hidden");
    if (!this._findPanel.classList.contains("jk-hidden")) {
      document.getElementById("jk-editor-find-input").focus();
    }
  }

  findNext() {
    const searchText = document.getElementById("jk-editor-find-input").value;
    if (!searchText) return;

    const textarea = this._textarea;
    const text = textarea.value;
    const startPos = textarea.selectionEnd;
    const index = text.indexOf(searchText, startPos);

    if (index !== -1) {
      textarea.focus();
      textarea.selectionStart = index;
      textarea.selectionEnd = index + searchText.length;
    } else {
      // Wrap around to beginning
      const wrapIndex = text.indexOf(searchText);
      if (wrapIndex !== -1) {
        textarea.focus();
        textarea.selectionStart = wrapIndex;
        textarea.selectionEnd = wrapIndex + searchText.length;
      } else {
        this.showNotification("No matches found");
      }
    }
  }

  findPrev() {
    const searchText = document.getElementById("jk-editor-find-input").value;
    if (!searchText) return;

    const textarea = this._textarea;
    const text = textarea.value;
    const startPos = textarea.selectionStart;
    const index = text.lastIndexOf(searchText, startPos - 1);

    if (index !== -1) {
      textarea.focus();
      textarea.selectionStart = index;
      textarea.selectionEnd = index + searchText.length;
    } else {
      // Wrap around to end
      const wrapIndex = text.lastIndexOf(searchText);
      if (wrapIndex !== -1) {
        textarea.focus();
        textarea.selectionStart = wrapIndex;
        textarea.selectionEnd = wrapIndex + searchText.length;
      } else {
        this.showNotification("No matches found");
      }
    }
  }

  replace() {
    const findText = document.getElementById("jk-editor-find-input").value;
    const replaceText = document.getElementById("jk-editor-replace-input").value;

    if (!findText) return;

    const textarea = this._textarea;
    const selectedText = textarea.value.substring(
      textarea.selectionStart,
      textarea.selectionEnd
    );

    if (selectedText === findText) {
      textarea.value =
        textarea.value.substring(0, textarea.selectionStart) +
        replaceText +
        textarea.value.substring(textarea.selectionEnd);
      this.isDirty = true;
      this.updateStatus();
      this.findNext();
    } else {
      this.showNotification("No selection or mismatch");
    }
  }

  replaceAll() {
    const findText = document.getElementById("jk-editor-find-input").value;
    const replaceText = document.getElementById("jk-editor-replace-input").value;

    if (!findText) return;

    const textarea = this._textarea;
    const count = (textarea.value.match(new RegExp(findText, "g")) || []).length;
    textarea.value = textarea.value.split(findText).join(replaceText);
    this.isDirty = true;
    this.updateStatus();
    this.showNotification(`Replaced ${count} occurrence(s)`);
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const currentState = this._textarea.value;
    this.redoStack.push(currentState);
    this._textarea.value = this.undoStack.pop();
    this.isDirty = true;
    this.updateStatus();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const currentState = this._textarea.value;
    this.undoStack.push(currentState);
    this._textarea.value = this.redoStack.pop();
    this.isDirty = true;
    this.updateStatus();
  }

  updateTitle() {
    const title = this.currentFile
      ? this.currentFile.split("/").pop()
      : "Untitled";
    document.getElementById("jk-editor-file-title").textContent =
      (this.isDirty ? "● " : "") + title;
  }

  showNotification(message) {
    // Simple toast notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2500);
  }

  onOpen() {
    this.updateStatus();
  }

  onClose() {
    if (this.isDirty) {
      const shouldSave = window.confirm("Save changes before closing?");
      if (shouldSave && this.currentFile) {
        this.saveFile();
      }
    }
  }

  destroy() {
    this._textarea = null;
    this._lineNumbers = null;
    this._findPanel = null;
    this.undoStack = [];
    this.redoStack = [];
    super.destroy();
  }
}
