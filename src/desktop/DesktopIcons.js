export default class DesktopIcon {

    constructor(label, iconSymbol, onClick = null) {
        this.label = label;
        this.iconSymbol = iconSymbol;
        this.onClick = onClick;
        this.element = null;
    }

    mount(container) {
        this.element = document.createElement('div');
        this.element.className = 'desktop-icon';
        this.element.innerHTML = `
            <div class="icon">${this.iconSymbol}</div>
            <div class="label">${this.label}</div>
        `;
        if (this.onClick) {
            this.element.style.cursor = 'pointer';
            this.element.addEventListener('click', this.onClick);
        }
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
