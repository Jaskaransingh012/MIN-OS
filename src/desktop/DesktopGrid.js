import DesktopIcon from './DesktopIcon.js';

export default class DesktopGrid {

    constructor(kernel) {
        this.container = null;
        this.fileSystem = kernel.getService("fileSystem");
        this.icons = [];
        this.appManager = kernel.getService("appManager");
        console.log("appmanager", this.appManager)
    }

    mount(workspace) {
        this.container = document.createElement('div');
        this.container.className = 'desktop-grid';

        // Define icons with elegant symbols


        /***
         Finding all the files and folders inside the desktop



         */

        const results = this.fileSystem.getChildren("/Desktop");
        console.log("results in desktop", results);

        const iconData = [];

        for(let i = 0; i<results.length; i++){
            const currenthChildren = results[i];

            iconData.push({
                label: currenthChildren.name,
                icon: currenthChildren.isDirectory() ? '📁' : '🗄️',
            })

        }


        iconData.forEach(data => {
            let icon;
            if(data.icon == '📁'){
                 icon = new DesktopIcon(data.label, data.icon, this.appManager);
            }else{
                icon = new DesktopIcon(data.label, data.icon);
            }
            icon.mount(this.container);
            this.icons.push(icon);
        });

        workspace.appendChild(this.container);
    }

    addIcon(label, iconSymbol, onClick = null) {
        const icon = new DesktopIcon(label, iconSymbol, onClick);
        icon.mount(this.container);
        this.icons.push(icon);
        return icon;
    }


    fileOnClick(){}
}
