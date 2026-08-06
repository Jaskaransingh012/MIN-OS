import Wallpaper from './Wallpaper.js';
import DesktopGrid from './DesktopGrid.js';

// ─── NEW imports ──────────────────────────────────────────────
import WindowManager from '../core/window-manager/WindowManager.js';
import WindowFactory from '../core/window-manager/WindowFactory.js';
import Dash from '../ui/components/Dash.js';

export default class Desktop {

    constructor(kernel) {
        this.container = null;
        this.wallpaper = null;
        this.grid = null;
        this.clockElement = null;
        this.clockInterval = null;
        // ─── NEW ──────────────────────────────────────────────
        this.windowManager = kernel.getService("windowManager");
        this.appManager = kernel.getService("appManager");
    }

    mount() {

        this.container = document.createElement('div');
        this.container.id = 'desktop-screen';
        document.body.appendChild(this.container);

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


        // It will manage windows inside this workspace
        this.windowManager.init(workspace);





        this.container.appendChild(workspace);

        // ── Build the "Dash" (creative replacement for taskbar) ──
        const dash = new Dash(this.container, this.appManager);
        dash.mount();


        // ─── NEW: Attach click handlers to dash icons ────────


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
