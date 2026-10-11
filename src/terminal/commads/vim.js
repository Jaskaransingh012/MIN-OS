export default class VimEditorCommand {
  constructor(kernel) {
    this.fileSystem = kernel.getService("fileSystem");
    this.terminal = null;
    this.state = null;
    this.vimEditor = null;
    this.overlay = null;
    this.statusBar = null;
    this.hiddenNodes = [];
    this.filePath = null;
    this.dirty = false;
    this.quitArmed = false;
  }

  async _execute(args) {
    try {
      const fileName = args[0];
      if (!fileName) throw new Error("No file name provided");

      this.filePath = this.fileSystem.path + "/" + fileName;

      const fileInstance = this.fileSystem.currentFolder._children.get(fileName);
      if (!fileInstance) throw new Error(`File "${fileName}" not found`);

      this.state = {
        content: fileInstance.content || "",
        fileInstance,
      };

      this.startEditor();
    } catch (error) {
      return error.message;
    }
  }

  startEditor() {
    this.terminal = document.getElementsByClassName("jk-terminal")[0];
    if (!this.terminal) throw new Error("Terminal element not found");

    // Hide existing terminal content instead of destroying it,
    // so its event listeners survive.
    this.hiddenNodes = Array.from(this.terminal.children).map((node) => ({
      node,
      display: node.style.display,
    }));
    this.hiddenNodes.forEach(({ node }) => (node.style.display = "none"));

    this.overlay = document.createElement("div");
    this.overlay.className = "flex flex-col w-full h-full";

    this.vimEditor = document.createElement("textarea");
    this.vimEditor.id = "vim-editor";
    this.vimEditor.name = "vim-editor";
    this.vimEditor.className =
      "flex-1 w-full min-h-0 bg-transparent text-white outline-none resize-none";
    this.vimEditor.value = this.state.content; // safe, no HTML parsing

    this.statusBar = document.createElement("div");
    this.statusBar.className = "text-xs text-gray-400 py-1";
    this.setStatus("Alt+W save | Esc quit | Alt+Q save & quit");

    this.overlay.append(this.vimEditor, this.statusBar);
    this.terminal.appendChild(this.overlay);

    this.addEventListeners();
    this.vimEditor.focus();
  }

  addEventListeners() {
    this.vimEditor.addEventListener("input", () => {
      this.dirty = true;
      this.quitArmed = false;
    });

    this.vimEditor.addEventListener("keydown", async (event) => {
      // Keep keystrokes away from the terminal's own handlers
      event.stopPropagation();

      // Alt + W -> save
      if (event.altKey && event.code === "KeyW") {
        event.preventDefault();
        await this.writeDocument();
        return;
      }

      // Alt + Q -> save and quit
      if (event.altKey && event.code === "KeyQ") {
        event.preventDefault();
        await this.writeDocument();
        this.destroy();
        return;
      }

      // Esc -> quit (warn once if unsaved)
      if (event.key === "Escape") {
        event.preventDefault();
        if (this.dirty && !this.quitArmed) {
          this.quitArmed = true;
          this.setStatus("Unsaved changes! Alt+W to save, or press Esc again to discard.");
          return;
        }
        this.destroy();
      }
    });
  }

  setStatus(text) {
    if (this.statusBar) this.statusBar.textContent = text;
  }

  async writeDocument() {
    const newContent = this.vimEditor.value;
    this.state.fileInstance.content = newContent;
    await this.fileSystem.write(this.filePath, newContent);
    this.dirty = false;
    this.quitArmed = false;
    this.setStatus("Saved.");
  }

  destroy() {
    if (this.overlay) this.overlay.remove();

    this.hiddenNodes.forEach(({ node, display }) => {
      node.style.display = display;
    });

    // Return focus to the terminal's input
    const input = this.terminal?.querySelector("input, textarea");
    if (input) input.focus();

    this.overlay = null;
    this.vimEditor = null;
    this.statusBar = null;
    this.hiddenNodes = [];
    this.state = null;
    this.terminal = null;
    this.dirty = false;
    this.quitArmed = false;
  }
}
