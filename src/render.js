import {ChunkStore, CHUNK_WIDTH} from './store.js'

export class Renderer {

    constructor(worldStore, ctx, camera, canvasW, canvasH) {
        this.imageStore = new ChunkStore()
        this.worldStore = worldStore
        this.mainCtx = ctx
        this.camera = camera
        this.canvasW = canvasW
        this.canvasH = canvasH
    }

    render() {
        this.mainCtx.fillStyle = "white"
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
                let chunkImg = this.imageStore.getChunk(cx, cy);
                if(!chunkImg) {
                    const chunk = this.worldStore.getChunk(cx, cy)
                    if (!chunk) continue;

                    chunkImg = this.renderChunkImage(cx, cy, chunk);
                    this.imageStore.storeChunk(cx,cy,chunkImg);
                }
                this.drawChunk(chunkImg, cx, cy);
            }
        }
    }

    invalidateRegion() {
        this.imageStore.clear();
    }

    renderChunkImage(chunkX, chunkY, chunk) {
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