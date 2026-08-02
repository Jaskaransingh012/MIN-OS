import Wallpaper from './Wallpaper.js';
import DesktopGrid from './DesktopGrid.js';

export default class Desktop {

    constructor() {
        this.container = null;
        this.wallpaper = null;
        this.grid = null;
        this.clockElement = null;
        this.clockInterval = null;
    }

    mount() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'desktop-screen';

        // Build workspace
        const workspace = document.createElement('div');
        workspace.className = 'desktop-workspace';
        workspace.id = 'desktop-workspace';

        // Add greeting
        const greeting = document.createElement('div');
        greeting.className = 'greeting';
        greeting.innerHTML = `
            <div class="hello">Welcome to <span>JK OS</span></div>
            <div class="sub">system ready <span class="cursor-blink"></span></div>
        `;
        workspace.appendChild(greeting);

        // Mount wallpaper (background)
        this.wallpaper = new Wallpaper();
        this.wallpaper.mount(workspace);

        // Mount grid
        this.grid = new DesktopGrid();
        this.grid.mount(workspace);

        this.container.appendChild(workspace);

        // ── Build the "Dash" (creative replacement for taskbar) ──
        const dash = document.createElement('div');
        dash.className = 'dash';
        dash.innerHTML = `
            <div class="dash-top">
                <div class="dash-logo">JK</div>
                <div class="dash-separator"></div>
                <div class="dash-time" id="dash-time">00:00</div>
            </div>
            <div class="dash-icons">
                <div class="dash-icon active">⌨</div>
                <div class="dash-icon">📁</div>
                <div class="dash-icon">⚙</div>
                <div class="dash-icon">♢</div>
            </div>
            <div class="dash-bottom">
                <div class="dash-status"></div>
                <div class="dash-user">Admin</div>
            </div>
        `;
        this.container.appendChild(dash);

        document.body.appendChild(this.container);

        // Clock in the dash
        this.clockElement = document.getElementById('dash-time');
        this.updateClock();
        this.clockInterval = setInterval(() => this.updateClock(), 1000);
    }

    updateClock() {
        if (!this.clockElement) return;
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        this.clockElement.innerHTML = `${hours}:${minutes}<span class="seconds">:${seconds}</span>`;
    }

    destroy() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
            this.clockInterval = null;
        }
        if (this.container) {
            this.container.style.opacity = '0';
            this.container.style.transition = 'opacity 0.6s ease';
            setTimeout(() => {
                this.container.remove();
            }, 600);
        }
    }
}
