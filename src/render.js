import {ChunkStore, CHUNK_WIDTH} from './store.js'

const HEAT_STOPS = [
    { t: 0.0, r: 0,   g: 0,   b: 128 },
    { t: 0.25, r: 0,   g: 200, b: 255 },
    { t: 0.5, r: 0,   g: 255, b: 0   },
    { t: 0.75, r: 255, g: 255, b: 0   },
    { t: 1.0, r: 255, g: 0,   b: 0   },
];

function heatColor(t) {
        t = Math.max(0, Math.min(1, t));

        for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
            const a = HEAT_STOPS[i];
            const b = HEAT_STOPS[i + 1];
            if (t >= a.t && t <= b.t) {
                const localT = (t - a.t) / (b.t - a.t);
                const r = Math.round(a.r + (b.r - a.r) * localT);
                const g = Math.round(a.g + (b.g - a.g) * localT);
                const bch = Math.round(a.b + (b.b - a.b) * localT);
                return `rgb(${r},${g},${bch})`;
            }
        }
        const last = HEAT_STOPS[HEAT_STOPS.length - 1];
        return `rgb(${last.r},${last.g},${last.b})`;
    }

export class Renderer {

    constructor(worldStore, heatStore, ctx, camera, canvasW, canvasH) {
        this.imageStore = new ChunkStore()
        this.heatImageStore = new ChunkStore()
        this.worldStore = worldStore
        this.heatStore = heatStore;
        this.mainCtx = ctx
        this.camera = camera
        this.canvasW = canvasW
        this.canvasH = canvasH
        this.enableHeatMap = false;
    }

    render() {
        if (this.enableHeatMap) {
            this.mainCtx.fillStyle = "rgb(0,0,128)"
        } else {
            this.mainCtx.fillStyle = "white"
        }
        
        this.mainCtx.fillRect(0,0, this.canvasW, this.canvasH)
        this.mainCtx.imageSmoothingEnabled = false;

        let corner1 = this.camera.screenToWorld(0,0,this.canvasW,this.canvasH)
        let corner2 = this.camera.screenToWorld(this.canvasW,this.canvasH,this.canvasW,this.canvasH)
        
        let cxMin = Math.floor(corner1.wx/CHUNK_WIDTH)
        let cyMin = Math.floor(corner1.wy/CHUNK_WIDTH)

        let cxMax = Math.floor(corner2.wx/CHUNK_WIDTH)
        let cyMax = Math.floor(corner2.wy/CHUNK_WIDTH)

        //culling
        for(let cy = cyMin; cy <= cyMax; cy++) {
            for(let cx = cxMin; cx <= cxMax; cx++) {
                let chunkImg = null;
                if (!this.enableHeatMap) {
                    chunkImg = this.imageStore.getChunk(cx, cy);
                    if(!chunkImg) {
                        const chunk = this.worldStore.getChunk(cx, cy)
                        if (!chunk) continue;

                        chunkImg = this.renderChunkImage(chunk);
                        this.imageStore.storeChunk(cx,cy,chunkImg);
                    }
                } else {
                    chunkImg = this.heatImageStore.getChunk(cx, cy);
                    if(!chunkImg) {
                        const chunk = this.heatStore.getChunk(cx, cy)
                        if (!chunk) continue;

                        chunkImg = this.renderChunkHeatImage(chunk);
                        this.heatImageStore.storeChunk(cx,cy,chunkImg);
                    }
                }
                
                
                this.drawChunk(chunkImg, cx, cy);
            }
        }
    }

    invalidateRegion() {
        this.imageStore.clear();
        this.heatImageStore.clear();
    }

    renderChunkImage(chunk) {
        const offscreen = new OffscreenCanvas(CHUNK_WIDTH, CHUNK_WIDTH);
        const ctx = offscreen.getContext("2d");
        ctx.fillStyle = "black";
        ctx.imageSmoothingEnabled = false;
        let x = 0;
        let y = 0;
        for(let i = 0; i < CHUNK_WIDTH * CHUNK_WIDTH; i++) {
            if (chunk[i] === 1) {
                ctx.fillRect(x,y,1,1)
            }
            x++;
            if(x == CHUNK_WIDTH) {
                y++;
                x=0;
            }
        }

        return offscreen
    }


    renderChunkHeatImage(chunk) {
        const offscreen = new OffscreenCanvas(CHUNK_WIDTH, CHUNK_WIDTH);
        const ctx = offscreen.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        let x = 0;
        let y = 0;
        for (let i = 0; i < CHUNK_WIDTH * CHUNK_WIDTH; i++) {
            const val = chunk[i];
            const t = val / (val + 50);
            ctx.fillStyle = heatColor(t);
            ctx.fillRect(x, y, 1, 1);
            x++;
            if (x == CHUNK_WIDTH) {
                y++;
                x = 0;
            }
        }

        return offscreen;
    }

    drawChunk(chunkImage, chunkX, chunkY) {
        let screen = this.camera.worldToScreen(chunkX * 64, chunkY * 64, this.canvasW, this.canvasH)
        let screen2 = this.camera.worldToScreen((chunkX+1) * 64, (chunkY+1) * 64, this.canvasW, this.canvasH)
        let sizeOnScreen = {
            x: screen2.sx - screen.sx,
            y: screen2.sy - screen.sy
        }
        this.mainCtx.drawImage(chunkImage, screen.sx, screen.sy, sizeOnScreen.x, sizeOnScreen.y)
    }
}