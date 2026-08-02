import DesktopIcon from './DesktopIcons.js';

export default class DesktopGrid {

    constructor() {
        this.container = null;
        this.icons = [];
    }

    mount(workspace) {
        this.container = document.createElement('div');
        this.container.className = 'desktop-grid';

        // Define icons
        const iconData = [
            { label: 'Terminal', icon: '⌨' },
            { label: 'Files', icon: '📁' },
            { label: 'Settings', icon: '⚙' },
        ];

        iconData.forEach(data => {
            const icon = new DesktopIcon(data.label, data.icon);
            icon.mount(this.container);
            this.icons.push(icon);
        });

        workspace.appendChild(this.container);
    }

    addIcon(label, iconSymbol, onClick) {
        const icon = new DesktopIcon(label, iconSymbol, onClick);
        icon.mount(this.container);
        this.icons.push(icon);
        return icon;
    }
}
