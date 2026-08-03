export default class WindowState{

    constructor({
        id,
        title,
        x=100,
        y=100,
        width=600,
        height=400,
        zIndex=1,
        minimized=false,
        maximized=false
    }){

        this.id = id;
        this.title = title;
        this.zIndex = zIndex;
        this.x = x;
        this.y=y;
        this.width = width;
        this.height = height;
        this.maximized = maximized;
        this.minimized = minimized;

    }

    clone(){
        return new WindowState({...this})
    }

}
