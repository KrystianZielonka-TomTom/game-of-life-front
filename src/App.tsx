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

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <GameController canvasRef={canvasRef} worldEngRef={worldEngRef} />
      <WorldViewer canvasRef={canvasRef} worldEngRef={worldEngRef} />
    </div>
  );
}

export default App;
