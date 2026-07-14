export const CHUNK_WIDTH = 64

export class ChunkStore {
    constructor() {
        this.store = new Map();
    }

    getCount() {
        return this.store.size
    }

    getChunk(chunkX, chunkY) {
        return this.store.get(`${chunkX},${chunkY}`);
    }

    storeChunk(chunkX, chunkY, chunkData) {
        this.store.set(`${chunkX},${chunkY}`, chunkData);
    }

    clear() {
        this.store.clear();
    }

    *entries() {
        for (const [key, chunk] of this.store) {
            const [cx, cy] = key.split(",").map(Number);
            yield { cx, cy, chunk };
        }
    }


    setCell(x,y, state) {
        let cX = Math.floor(x/CHUNK_WIDTH)
        let cY = Math.floor(y/CHUNK_WIDTH)
        
        let lX = floorMod(x, CHUNK_WIDTH)
        let lY = floorMod(y, CHUNK_WIDTH)

        let chunk = this.getChunk(cX, cY)
        if (!chunk) {
            chunk = new Uint8Array(CHUNK_WIDTH*CHUNK_WIDTH)
            this.storeChunk(cX, cY, chunk)
        }
        chunk[lY * CHUNK_WIDTH + lX] = state;
    }

    storeCells(x, y, width, height, data) {
        let a = 0;
        for(let j = 0; j < height; j++) {
            for(let i = 0; i < width; i++) {
                let cX = Math.floor((x + i)/CHUNK_WIDTH)
                let cY = Math.floor((y + j)/CHUNK_WIDTH)
                
                let lX = floorMod(x + i, CHUNK_WIDTH)
                let lY = floorMod(y + j, CHUNK_WIDTH)
                
                let chunk = this.getChunk(cX, cY)
                if (!chunk) {
                    chunk = new Uint8Array(CHUNK_WIDTH*CHUNK_WIDTH)
                    this.storeChunk(cX, cY, chunk)
                }

                chunk[lY * CHUNK_WIDTH + lX] = data[a]
                a++
            }
        }
        
    }
    
}

function floorMod(a, b) {
    return ((a % b) + b) % b;
}