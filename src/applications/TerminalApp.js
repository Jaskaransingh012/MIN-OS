import BaseApp from "../core/app-manager/BaseApp.js";

export default class TerminalApp extends BaseApp {

  // ─── commands registry ────────────────────────────────────────

  // ─── createContent (main entry) ──────────────────────────────


  createContent() {

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
      if(pathEl != null){

        pathEl.innerText = path;
      }
    }
    input.addEventListener('keydown', async (event)=> {

      if(event.key == 'Tab') {
        event.preventDefault();

        this.handleAutoComplete(input, output);
        return;

      }



      if(event.key=='Enter'){
        const shell = this.kernel.getService("shell");
        const value = input.value;

        const outputShell = await shell.execute(value);
        output.innerHTML += `<p>${outputShell}</p>`
        input.value = "";
        updatePath(this.kernel);
      }

    })
  }

  handleAutoComplete(input, output) {

      const fileSystem = this.kernel.getService("fileSystem");

      const value = input.value;

      const parts = value.split(/\s+/);

      if(parts.length < 2) return;

      const currentWord =parts[parts.length-1];

      const suggestions = fileSystem.getAutoCompleteSuggestions(currentWord);

      if(suggestions.length == 0) {
        return;
      }

      if(suggestions.length == 1) {

        const suggestion = suggestions[0];

        parts[parts.length - 1] = suggestion.name + (suggestion.isDirectory ? "/" : "");

        input.value = parts.join(" ");

        return;
      }

      const options = suggestions.map(item =>
        item.name+ (item.isDirectory ? "/" : "")
      )
      .join("  ");

output.innerHTML += `
    <div class="jk-autocomplete-options">
      ${options}
    </div>
  `;




  }

}
