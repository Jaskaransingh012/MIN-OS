import BaseApp from "../core/app-manager/BaseApp.js";

export default class TextEditorApp extends BaseApp {
  constructor(config, kernel = null) {
    super(config, kernel);
    this.title = "Text Editor";
    this.icon = "📝";
    this.currentFile = null;
    this.isDirty = false;
    this.fileSystem = kernel?.getService("fileSystem");
    this.shell = kernel?.getService("shell");
  }

  createContent() {
    const container = document.createElement("div");
    container.className = "jk-text-editor";

    // ── Menu Bar ──
    const menuBar = document.createElement("div");
    menuBar.className = "jk-editor-menu-bar";
    menuBar.innerHTML = `
      <div class="jk-menu-group">
        <button class="jk-menu-btn" id="jk-editor-new">New</button>
        <button class="jk-menu-btn" id="jk-editor-open">Open</button>
        <button class="jk-menu-btn" id="jk-editor-save">Save</button>
        <button class="jk-menu-btn" id="jk-editor-save-as">Save As</button>
      </div>
      <div class="jk-menu-group">
        <button class="jk-menu-btn" id="jk-editor-undo">↶ Undo</button>
        <button class="jk-menu-btn" id="jk-editor-redo">↷ Redo</button>
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

      // Ctrl+Z / Cmd+Z: Undo (browser handles this, but we can enhance)
      // Ctrl+Y / Cmd+Shift+Z: Redo (browser handles this, but we can enhance)
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
      .addEventListener("click", () => document.execCommand("undo"));
    document
      .getElementById("jk-editor-redo")
      .addEventListener("click", () => document.execCommand("redo"));

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
    this.updateTitle();
    this.updateStatus();
  }

  openFile() {
    const path = prompt("Enter file path to open:");
    if (!path) return;

    if (!this.fileSystem) {
      alert("File system service not available");
      return;
    }

    try {
      const content = this.fileSystem.readFile(path);
      this._textarea.value = content;
      this.currentFile = path;
      this.isDirty = false;
      this.updateTitle();
      this.updateStatus();
    } catch (error) {
      alert(`Error opening file: ${error.message}`);
    }
  }

  saveFile() {
    if (!this.currentFile) {
      this.saveFileAs();
      return;
    }

    if (!this.fileSystem) {
      alert("File system service not available");
      return;
    }

    try {
      this.fileSystem.writeFile(this.currentFile, this._textarea.value);
      this.isDirty = false;
      this.updateStatus();
      alert(`File saved: ${this.currentFile}`);
    } catch (error) {
      alert(`Error saving file: ${error.message}`);
    }
  }

  saveFileAs() {
    const path = prompt("Enter file path:");
    if (!path) return;

    if (!this.fileSystem) {
      alert("File system service not available");
      return;
    }

    try {
      this.fileSystem.writeFile(path, this._textarea.value);
      this.currentFile = path;
      this.isDirty = false;
      this.updateTitle();
      this.updateStatus();
      alert(`File saved: ${path}`);
    } catch (error) {
      alert(`Error saving file: ${error.message}`);
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
      alert("No more matches found");
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
      alert("No more matches found");
    }
  }

  replace() {
    const findText = document.getElementById("jk-editor-find-input").value;
    const replaceText = document.getElementById("jk-editor-replace-input")
      .value;

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
    }
  }

  replaceAll() {
    const findText = document.getElementById("jk-editor-find-input").value;
    const replaceText = document.getElementById("jk-editor-replace-input")
      .value;

    if (!findText) return;

    const textarea = this._textarea;
    textarea.value = textarea.value.split(findText).join(replaceText);
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

  onOpen() {
    this.updateStatus();
  }

  onClose() {
    if (this.isDirty) {
      const confirm = window.confirm("Save changes before closing?");
      if (confirm && this.currentFile) {
        this.saveFile();
      }
    }
  }

  destroy() {
    this._textarea = null;
    this._lineNumbers = null;
    this._findPanel = null;
    super.destroy();
  }
}
