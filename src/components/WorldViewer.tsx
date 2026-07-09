import { useRef, useEffect } from "react";
import { useWorldEngine } from "../hooks/useWorldEngine";
import type { WorldEngine } from "../hooks/useWorldEngine";
import { ChunkStore } from "../store.js";

export default function WorldViewer({
  canvasRef,
  worldEngRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  worldEngRef: React.RefObject<WorldEngine | null>;
}) {
  useWorldEngine(canvasRef, worldEngRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas == null) throw new Error("canvas is null");

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      worldEngRef.current?.resize(canvas.width, canvas.height);
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} />
    </div>
  );
}
