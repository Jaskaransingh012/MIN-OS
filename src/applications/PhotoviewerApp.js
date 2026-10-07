import BaseApp from "../core/app-manager/BaseApp.js";

export default class PhotoApp extends BaseApp {


    createContent() {

        const container = document.createElement('div');
        container.className = 'jk-PhotoApp';

        const fileManager = this.kernel.getService('fileManager');


        const blob = new Blob([binaryData], {
            type: "image/png"
        });

        const imageUrl = URL.createObjectURL(blob);

        const img = document.createElement("img");
        img.className += 'w-full h-full'
        img.src = imageUrl;

        container.append(img);


    }



}
