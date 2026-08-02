export default class Wallpaper {

    constructor() {
        this.overlay = null;
    }

    mount(container) {
        // Elegant dark gradient background
        const bg = document.createElement('div');
        bg.className = 'wallpaper-bg';
        container.prepend(bg);

        // Subtle scanline overlay for that premium texture
        const overlay = document.createElement('div');
        overlay.className = 'scanline-overlay';
        container.prepend(overlay);
        this.overlay = overlay;
    }

    setWallpaper(colorOrGradient) {
        const bg = this.overlay?.nextElementSibling;
        if (bg) {
            bg.style.background = colorOrGradient;
        }
    }
}
