export default class DesktopIcon {

    constructor(label, iconSymbol, appManager=null) {
        this.label = label;
        this.iconSymbol = iconSymbol;
        this.element = null;
        this.appManager = appManager;
    }

    mount(container) {
        this.element = document.createElement('div');
        this.element.className = 'desktop-icon';
        this.element.innerHTML = `
            <div class="icon">${this.iconSymbol}</div>
            <div class="label">${this.label}</div>
        `;
        this.element.style.cursor = 'pointer';
        this.element.addEventListener('click', ()=> {
            console.log("clicked")
            this.appManager.openApp('file-manager',{},{}, true);
        });

        container.appendChild(this.element);
        return this.element;
    }

    setLabel(newLabel) {
        this.label = newLabel;
        const labelEl = this.element?.querySelector('.label');
        if (labelEl) labelEl.textContent = newLabel;
    }

    setIcon(newIcon) {
        this.iconSymbol = newIcon;
        const iconEl = this.element?.querySelector('.icon');
        if (iconEl) iconEl.textContent = newIcon;
    }
}
