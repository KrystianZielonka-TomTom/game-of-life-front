
const MAX_ZOOM = 10;
const MIN_ZOOM = 0.1;
const DEFAULT_ZOOM = 3;
export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.zoom = DEFAULT_ZOOM;
    }

    // screenPos = (wPos - cameraPos) * zoom2d + (canvas2d/2)
    // screenPos - (canvas2d/2) = (wPos - cameraPos) * zoom2d
    // (screenPos - (canvas2d/2))/zoom2d = wPos - cameraPos
    //(screenPos - (canvas2d/2))/zoom2d + cameraPos = wPos
    screenToWorld(sx, sy, canvasW, canvasH) {
        return {
            wx: this.x + (sx - canvasW / 2) / this.zoom,
            wy: this.y + (sy - canvasH / 2) / this.zoom,
        };
    }

    worldToScreen(wx, wy, canvasW, canvasH) {
        // console.log(wx,wy,canvasW,canvasH,this.zoom,this.x,this.y)
        return {
            sx: (wx - this.x) * this.zoom + (canvasW/2),
            sy: (wy - this.y) * this.zoom + (canvasH/2)
        }
    }

    panBy(dx, dy) {
        this.x -= dx / this.zoom;
        this.y -= dy / this.zoom;
    }

    zoomAt(sx, sy, canvasW, canvasH, factor) {
        const before = this.screenToWorld(sx, sy, canvasW, canvasH);
        this.zoom += factor;
        if (this.zoom > MAX_ZOOM) this.zoom = MAX_ZOOM;
        if (this.zoom < MIN_ZOOM) this.zoom = MIN_ZOOM;
        const after = this.screenToWorld(sx, sy, canvasW, canvasH);
        this.x += before.wx - after.wx;
        this.y += before.wy - after.wy;
  }
}