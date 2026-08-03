import Wallpaper from './Wallpaper.js';
import DesktopGrid from './DesktopGrid.js';

// ─── NEW imports ──────────────────────────────────────────────
import WindowManager from '../core/window-manager/WindowManager.js';
import WindowFactory from '../core/window-manager/WindowFactory.js';

export default class Desktop {

    constructor(windowManager) {
        this.container = null;
        this.wallpaper = null;
        this.grid = null;
        this.clockElement = null;
        this.clockInterval = null;
        // ─── NEW ──────────────────────────────────────────────
        this.windowManager = windowManager;
    }

    mount() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'desktop-screen';

        // Build workspace
        const workspace = document.createElement('div');
        workspace.className = 'desktop-workspace';
        workspace.id = 'desktop-workspace';



        // Mount wallpaper (background)
        this.wallpaper = new Wallpaper();
        this.wallpaper.mount(this.container);


        // Mount grid
        this.grid = new DesktopGrid();
        this.grid.mount(workspace);


        // ─── NEW: Instantiate WindowManager ──────────────────
        // It will manage windows inside this workspace
        this.windowManager.init(workspace);

        // ─── OPTIONAL: Open a few initial windows ────────────
        // You can comment these out if you prefer to open only on icon click
        setTimeout(() => {
            const termWin = WindowFactory.createTerminal(this.windowManager);
            this.windowManager.addWindow(termWin);
            const aboutWin = WindowFactory.createAbout(this.windowManager);
            this.windowManager.addWindow(aboutWin);
        }, 300);

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
                <div class="dash-icon active" data-app="terminal">⌨</div>
                <div class="dash-icon" data-app="files">📁</div>
                <div class="dash-icon" data-app="settings">⚙</div>
                <div class="dash-icon" data-app="about">♢</div>
            </div>
            <div class="dash-bottom">
                <div class="dash-status"></div>
                <div class="dash-user">Admin</div>
            </div>
        `;
        this.container.appendChild(dash);

        document.body.appendChild(this.container);

        // ─── NEW: Attach click handlers to dash icons ────────
        const icons = dash.querySelectorAll('.dash-icon');
        icons.forEach(icon => {
            icon.addEventListener('click', () => {
                const app = icon.dataset.app;
                let win = null;
                switch (app) {
                    case 'terminal':
                        win = WindowFactory.createTerminal(this.windowManager);
                        break;
                    case 'about':
                        win = WindowFactory.createAbout(this.windowManager);
                        break;
                    // Add more cases for 'files', 'settings' when you have factories
                    default:
                        return;
                }
                if (win) {
                    this.windowManager.addWindow(win);
                    // optional: mark active icon
                    icons.forEach(i => i.classList.remove('active'));
                    icon.classList.add('active');
                }
            });
        });

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
        // ─── NEW: Destroy window manager ──────────────────────
        if (this.windowManager) {
            this.windowManager.destroy();
            this.windowManager = null;
        }

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
