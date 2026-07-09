import { useEffect } from "react";
import { fetchNextState, fetchRandomCells } from "../api/cells";
import type { WorldEngine } from "../hooks/useWorldEngine";
import type { WorldDto } from "../types/world";

export default function GameController({
  canvasRef,
  worldEngRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  worldEngRef: React.RefObject<WorldEngine | null>;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas == null) throw new Error("canvas is null");

    function zoom(e: WheelEvent) {
      e.preventDefault();
      const we = worldEngRef.current;
      if (we == null) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const factor = e.deltaY * -0.005;
      we.zoomAt(x, y, canvas.width, canvas.height, factor);
    }

    function click(e: MouseEvent) {
      e.preventDefault();

      const we = worldEngRef.current;
      if (we == null) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      we.swapCell(x, y, canvas.width, canvas.height);
    }
    window.addEventListener("wheel", zoom, { passive: false });
    window.addEventListener("mousedown", click, { passive: false });
    return () => {
      window.removeEventListener("wheel", zoom);
      window.removeEventListener("mousedown", click);
    };
  }, []);

  async function handleRequestData() {
    const we = worldEngRef.current;
    if (we == null) return;
    try {
      const cellPart = await fetchRandomCells();
      we.loadCells(
        cellPart.x,
        cellPart.y,
        cellPart.width,
        cellPart.height,
        cellPart.data,
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function requestNextStep() {
    const we = worldEngRef.current;
    if (we == null) return;
    try {
      const worldDto = await fetchNextState(1, {
        tiles: we.getTiles(),
      } as WorldDto);

      we.store.clear();
      we.setTiles(worldDto.tiles);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <p>I will be controlling the game</p>
      <button onClick={handleRequestData}>Get random state</button>
      <button onClick={requestNextStep}>Get next state</button>
    </>
  );
}
