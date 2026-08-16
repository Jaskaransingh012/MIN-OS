export default class VimEditorCommand {
  constructor(kernel) {
    this.fileSystem = kernel.getService("fileSystem");
    this.terminal = null; // will be set in startEditor
    this.state = null; // editor state object
    this.vimEditor = null;
    this.filePath = null;
  }

  async _execute(args) {
    try {
      const fileName = args[0];
      if (!fileName) throw new Error("No file name provided");
      this.filePath = this.fileSystem.path + "/" + fileName;


      const fileInstance =
        this.fileSystem.currentFolder._children.get(fileName);
      if (!fileInstance) throw new Error(`File "${fileName}" not found`);

      // Read file content (assume fileInstance.content is a string)
      const content = fileInstance.content || "";

      this.state = {
        content: content,
        fileInstance: fileInstance,
      };

      this.startEditor();
    } catch (error) {
      return error.message;
    }
  }

  startEditor() {
    // Get the terminal element
    this.terminal = document.getElementsByClassName("jk-terminal")[0];
    if (!this.terminal) throw new Error("Terminal element not found");

    // store the innerhtml of terminal so that the previous terminal state in managed
    this.state.previousTerminalState = this.terminal.innerHTML;

    // Build editor UI

    const vimUi = `

            <textarea id="vim-editor" name="vim-editor"  class="min-w-full min-h-full text-white">${this.state.content}</textarea>

        `;
    this.terminal.innerHTML = vimUi;
    this.addEvetListener();
  }

  addEvetListener() {
    const activeKeys = {};

    this.vimEditor = document.getElementById("vim-editor");
    this.vimEditor.addEventListener("keydown", (event) => {
      activeKeys[event.key.toLowerCase()] = true;

      if (activeKeys["alt"] && activeKeys["w"]) {
        console.log("control + w combination detected!");
        this.writeDocument();

        // Optional: clear state or execute your custom function
      }

      this.vimEditor.addEventListener("keyup", (event) => {
        // Remove the key from the active object once released
        activeKeys[event.key.toLowerCase()] = false;
      });
    });
  }


  async writeDocument (){
    const fileInstance = this.state.fileInstance;
    const newContent = this.vimEditor.value;
    fileInstance.content = newContent;
    await this.fileSystem.write(this.filePath, newContent);

  }

  destroy() {
    if (this.terminal) {
      this.terminal.innerHTML = this.state.previousTerminalState;
    }
    this.state = null;
    this.terminal = null;
  }
}
