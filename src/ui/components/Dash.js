export default class Dash{

    constructor(container, appManager){

        this.container = container;
        this.appManager = appManager;

    }

    mount(){

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

        const icons = dash.querySelectorAll('.dash-icon');
        icons.forEach(icon => {
            icon.addEventListener('click', () => {

                const app = icon.dataset.app;
                console.log(app)
                if(!app) return;
                let win = null;
                switch (app) {
                    case 'terminal':
                        this.appManager.openApp('terminal',{},{},true);

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

    }


}
