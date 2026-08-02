export default class Wallpaper {

    constructor() {
        this.overlay = null;
    }

    mount(container) {
        // Create a background div
        const bg = document.createElement('div');
        bg.style.cssText = `
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at 50% 40%, #1a1a2e, #0A0A0A 70%);
            z-index: 0;
            pointer-events: none;
        `;
        container.prepend(bg);

        // Add scanline overlay
        const overlay = document.createElement('div');
        overlay.className = 'scanline-overlay';
        overlay.style.zIndex = '1';
        container.prepend(overlay);
        this.overlay = overlay;
    }

    setWallpaper(colorOrGradient) {
        // Allow dynamic wallpaper changes
        const bg = this.overlay?.previousElementSibling;
        if (bg) {
            bg.style.background = colorOrGradient;
        }
    }
}
