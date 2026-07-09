import { useEffect, useRef, useState } from "react";
import type { WorldEngine } from "./hooks/useWorldEngine";
import { ChunkStore } from "./store.js";
import WorldViewer from "./components/WorldViewer";
import GameController from "./components/GameController";
import type { CellPart } from "./types/cellPart";
import { useRandomCells } from "./hooks/useCells.js";
import { fetchRandomCells } from "./api/cells";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldEngRef = useRef<WorldEngine | null>(null);

  useEffect(() => {
    const we = worldEngRef.current;
    if (we == null) return;

    fetchRandomCells().then((cells) => {
      we.loadCells(cells.x, cells.y, cells.width, cells.height, cells.data);
    });
  }, [worldEngRef]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <WorldViewer canvasRef={canvasRef} worldEngRef={worldEngRef} />
      <GameController canvasRef={canvasRef} worldEngRef={worldEngRef} />
    </div>
  );
}

export default App;
