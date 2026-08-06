import BaseApp from "../core/app-manager/BaseApp.js";

export default class TerminalApp extends BaseApp {

  // ─── commands registry ────────────────────────────────────────

  // ─── createContent (main entry) ──────────────────────────────


  createContent() {
    console.log("services available ",this.kernel.listOfServices());

    const container = document.createElement('div');
    container.className = 'jk-terminal';



    // ── output ──
    const output = document.createElement('div');
    output.className = 'jk-term-output';
    output.id = "jk-term-output"
    container.appendChild(output);

    // ── input row ──
    const inputRow = document.createElement('div');
    inputRow.className = 'jk-term-input-row';
    inputRow.innerHTML = `
      <div class="jk-prompt-wrap">
        <span class="jk-symbol">$</span>
        <span id="jk-path" class="jk-prompt-user">/Desktop</span>
        <span class="jk-prompt-path">~</span>
      </div>
      <input id="jk-term-input" class="jk-term-input" type="text" autofocus spellcheck="false" autocomplete="off" />
    `;
    container.appendChild(inputRow);




    // store container ref for cleanup
    this._container = container;
    return container;
  }

  _bindEvents(){
    const shell = this.kernel.getService("shell");
    const input = document.getElementById("jk-term-input");
    const output= document.getElementById("jk-term-output");

    function updatePath(kernel){
      const pathEl = document.getElementById("jk-path");
      const fileSystem = kernel.getService("fileSystem");
      const path  = fileSystem.path;
      pathEl.innerText = path;
    }
    input.addEventListener('keydown', async (event)=> {
      if(event.key=='Enter'){
        const shell = this.kernel.getService("shell");
        const value = input.value;

        const outputShell = await shell.execute(value);
        output.innerHTML += `<p>${outputShell}</p>`
        updatePath(this.kernel);
      }

    })
  }


}
