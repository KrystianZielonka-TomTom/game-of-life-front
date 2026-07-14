// hooks/useWorldEngine.ts
import { useEffect } from "react";
import { Camera } from "../camera.js";
import { Renderer } from "../render.js";
import { ChunkStore } from "../store.js";
import type { TileDto } from "../types/world.js";

export class WorldEngine {
  store: ChunkStore;
  camera: Camera;
  renderer: Renderer;
  heatMapStore: ChunkStore;

  constructor(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
    this.store = new ChunkStore();
    this.heatMapStore = new ChunkStore();
    this.camera = new Camera();
    this.renderer = new Renderer(this.store, this.heatMapStore, ctx, this.camera, canvasW, canvasH);
  }

  getTiles(): TileDto[] {
    const tiles: TileDto[] = [];
    for (const { cx, cy, chunk } of this.store.entries()) {
      tiles.push({
        tileIndexX: cx,
        tileIndexY: cy,
        data: chunk,
      });
    }
    return tiles;
  }

  calcHeat(nextTiles: TileDto[]) {
    nextTiles.forEach((t) => {
      const oldChunk: Uint8Array = this.store.getChunk(t.tileIndexX, t.tileIndexY);
      const newChunk = t.data;
      let heatMapChunk: Uint8Array = this.heatMapStore.getChunk(t.tileIndexX, t.tileIndexY);
      if (heatMapChunk == null) {
        const c = new Uint8Array(64*64);
        this.heatMapStore.storeChunk(t.tileIndexX, t.tileIndexY, c);
        heatMapChunk = c;
      }

      if (oldChunk != null) {
      for(let i = 0; i < 64*64; i++) {
        if (oldChunk[i] != newChunk[i] && heatMapChunk[i] < 255) {
          heatMapChunk[i] += 1;
        }
      }
    }
    });
  }

  setTiles(tiles: TileDto[]) {
    tiles.forEach((t) => {
        this.store.storeChunk(t.tileIndexX, t.tileIndexY, t.data)
    });
    this.renderer.invalidateRegion();
    this.renderer.render();
  }

  resize(w: number, h: number) {
    this.renderer.canvasW = w;
    this.renderer.canvasH = h;
    this.renderer.render();
  }

  zoomAt(sx: number, sy: number, canvasW: number, canvasH: number, factor: number) {
    this.camera.zoomAt(sx, sy, canvasW, canvasH, factor);
    this.renderer.render();
  }

  setCell(sx: number, sy: number, canvasW: number, canvasH: number, state: number) {
    const coords = this.camera.screenToWorld(sx,sy,canvasW,canvasH);
    this.store.setCell(Math.floor(coords.wx), Math.floor(coords.wy), state);
    this.renderer.invalidateRegion();
    this.renderer.render();
  }

  setCellRect(sx: number, sy: number, size: number, canvasW: number, canvasH: number, state: number) {
    const coords = this.camera.screenToWorld(sx,sy,canvasW,canvasH);
    const x = Math.floor(coords.wx)
    const y = Math.floor(coords.wy)

    for(let i = -size; i < size; i++) {
        for(let j = -size; j < size; j++) {
            this.store.setCell(x + i, y + j, state);
        }
    }
    
    this.renderer.invalidateRegion();
    this.renderer.render();
  }

  getActiveChunkCount(): number {
    return this.store.getCount();
  }
  clearStore() {
    this.store.clear();
  }
}

export function useWorldEngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  worldEngRef: React.RefObject<WorldEngine | null>
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas == null) throw new Error("canvas is null");
    const ctx = canvas.getContext("2d");
    if (ctx == null) throw new Error("ctx is null");

    worldEngRef.current = new WorldEngine(ctx, canvas.width, canvas.height);
  }, []);
}