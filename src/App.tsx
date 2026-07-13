import { useRef } from "react";
import type { WorldEngine } from "./hooks/useWorldEngine";
import WorldViewer from "./components/WorldViewer";
import GameController from "./components/GameController";

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
