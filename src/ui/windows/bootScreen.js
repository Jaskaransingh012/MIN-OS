export default class BootScreen {

    constructor() {
        this.container = null;
        this.progressFill = null;
        this.logsContainer = null;
        this.promptText = null;
    }

    mount() {
        this.container = document.createElement("div");
        this.container.id = "boot-screen";

        this.container.innerHTML = `
            <div class="boot-header">
                <div class="logo">JK <span>OS</span></div>
                <div class="version">Version 1.0.0</div>
            </div>
            <div class="boot-progress">
                <div class="fill" id="boot-progress-fill" style="width: 0%;"></div>
            </div>
            <div class="boot-logs" id="boot-logs-container"></div>
            <div class="boot-prompt">
                <span class="prompt-text" id="boot-prompt-text">System ready</span>
                <span class="cursor"></span>
            </div>
        `;

        document.body.appendChild(this.container);

        this.progressFill = document.getElementById("boot-progress-fill");
        this.logsContainer = document.getElementById("boot-logs-container");
        this.promptText = document.getElementById("boot-prompt-text");
    }

    setProgress(percent) {
        const clamped = Math.min(100, Math.max(0, percent));
        if (this.progressFill) {
            this.progressFill.style.width = clamped + "%";
        }
    }

    setStatus(text) {
        if (this.promptText) {
            this.promptText.textContent = text;
        }
    }

    addLog(text, type = 'INFO') {
        if (!this.logsContainer) return;

        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let statusText = '';
        let statusClass = '';

        switch (type.toUpperCase()) {
            case 'OK':
                statusText = '[  OK  ]';
                statusClass = 'ok';
                break;
            case 'FAIL':
                statusText = '[FAILED]';
                statusClass = 'fail';
                break;
            case 'INFO':
            default:
                statusText = '[ INFO ]';
                statusClass = 'info';
                break;
        }

        const div = document.createElement("div");
        div.className = "log-line";
        div.innerHTML = `
            <span class="time">[${time}]</span>
            <span class="status ${statusClass}">${statusText}</span>
            <span class="msg">${text}</span>
        `;

        this.logsContainer.appendChild(div);
        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
    }

    async destroy() {
        if (this.container) {
            this.container.classList.add("fade-out");
            await new Promise(resolve => setTimeout(resolve, 800));
            this.container.remove();
        }
    }
}
