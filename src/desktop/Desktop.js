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
        this.grid = new DesktopGrid(kernel);
        this.clockElement = null;
        this.clockInterval = null;

        // ─── NEW ──────────────────────────────────────────────
        this.windowManager = kernel.getService("windowManager");
        this.appManager = kernel.getService("appManager");

        // Context menu state
        this.contextMenu = null;
        this.contextMenuVisible = false;
        this.boundContextHandler = this.handleContextMenu.bind(this);
        this.boundDocumentClick = this.hideContextMenu.bind(this);
    }

    mount() {
        this.container = document.createElement('div');
        this.container.id = 'desktop-screen';
        document.body.appendChild(this.container);

        // Build workspace
        const workspace = document.createElement('div');
        workspace.className = 'desktop-workspace';
        workspace.id = 'desktop-workspace';

        // Mount wallpaper
        this.wallpaper = new Wallpaper();
        this.wallpaper.mount(this.container);

        // Mount grid
        this.grid.mount(workspace);

        // Window manager
        this.windowManager.init(workspace);

        this.container.appendChild(workspace);

        // Dash
        const dash = new Dash(this.container, this.appManager);
        dash.mount();

        // Clock
        this.clockElement = document.getElementById('dash-time');
        this.updateClock();
        this.clockInterval = setInterval(() => this.updateClock(), 1000);

        // ─── NEW: Right‑click context menu ──────────────────
        this.injectStyles();
        workspace.addEventListener('contextmenu', this.boundContextHandler);
        // Store workspace reference for cleanup
        this.workspace = workspace;
    }

    // ─── Context menu methods ────────────────────────────────

    injectStyles() {
        if (document.getElementById('desktop-context-styles')) return;
        const style = document.createElement('style');
        style.id = 'desktop-context-styles';
        style.textContent = `
            .desktop-context-menu {
                position: fixed;
                background: rgba(30, 30, 40, 0.92);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 10px;
                padding: 6px 0;
                min-width: 190px;
                box-shadow: 0 12px 40px rgba(0,0,0,0.5);
                z-index: 10000;
                color: #eee;
                font-family: 'Segoe UI', system-ui, sans-serif;
                font-size: 14px;
                animation: fadeIn 0.15s ease;
                user-select: none;
            }
            .desktop-context-menu .menu-item {
                padding: 8px 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 12px;
                transition: background 0.1s;
                border-radius: 4px;
                margin: 2px 6px;
            }
            .desktop-context-menu .menu-item:hover {
                background: rgba(255, 255, 255, 0.12);
            }
            .desktop-context-menu .menu-item .icon {
                font-size: 16px;
                width: 20px;
                text-align: center;
            }
            .desktop-context-menu .menu-divider {
                height: 1px;
                background: rgba(255,255,255,0.1);
                margin: 4px 12px;
            }
            @keyframes fadeIn {
                from { opacity: 0; transform: scale(0.96); }
                to { opacity: 1; transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    handleContextMenu(e) {
        e.preventDefault();
        this.showContextMenu(e.clientX, e.clientY);
    }

    showContextMenu(x, y) {
        // Remove any existing menu
        this.hideContextMenu();

        const menu = document.createElement('div');
        menu.className = 'desktop-context-menu';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        // ── Menu items ──
        const items = [
            { label: 'Refresh', icon: '🔄', action: () => console.log('Refresh desktop') },
            { label: 'New Folder', icon: '📁', action: () => console.log('New folder created') },
            { label: 'Change Wallpaper', icon: '🖼️', action: () => console.log('Open wallpaper picker') },
            { divider: true },
            { label: 'Open Terminal', icon: '⌨️', action: () => console.log('Launch terminal') },
        ];

        items.forEach(item => {
            if (item.divider) {
                const div = document.createElement('div');
                div.className = 'menu-divider';
                menu.appendChild(div);
                return;
            }
            const el = document.createElement('div');
            el.className = 'menu-item';
            el.innerHTML = `<span class="icon">${item.icon}</span><span>${item.label}</span>`;
            el.addEventListener('click', (ev) => {
                ev.stopPropagation();
                item.action();
                this.hideContextMenu();
            });
            menu.appendChild(el);
        });

        document.body.appendChild(menu);
        this.contextMenu = menu;
        this.contextMenuVisible = true;

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', this.boundDocumentClick);
        }, 0);
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
            this.contextMenuVisible = false;
        }
        document.removeEventListener('click', this.boundDocumentClick);
    }

    // ─── Clock ────────────────────────────────────────────────

    updateClock() {
        if (!this.clockElement) return;
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        this.clockElement.innerHTML = `${hours}:${minutes}<span class="seconds">:${seconds}</span>`;
    }

    // ─── Destroy ──────────────────────────────────────────────

    destroy() {
        // Remove context menu listeners
        if (this.workspace) {
            this.workspace.removeEventListener('contextmenu', this.boundContextHandler);
            this.workspace = null;
        }
        this.hideContextMenu();

        // Window manager
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

        // Optional: remove injected styles if you want (not necessary)
        // const styleEl = document.getElementById('desktop-context-styles');
        // if (styleEl) styleEl.remove();
    }
}
