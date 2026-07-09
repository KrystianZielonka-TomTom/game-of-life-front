import { useEffect, useState, useRef } from "react";
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
  const [paintSize, setPaintSize] = useState<number>(1);
  const [paintColor, setPaintColor] = useState<number>(1);
  const [play, setPlay] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);

  const paintColorRef = useRef(1);
  const paintSizeRef = useRef(1);
  const stepRef = useRef(0);

  useEffect(() => {
    paintColorRef.current = paintColor;
  }, [paintColor]);

  useEffect(() => {
    paintSizeRef.current = paintSize;
  }, [paintSize]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (!play) return;
    const id = setInterval(() => {
      requestNextStep();
    }, 1000);
    return () => clearInterval(id);
  }, [play]);

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

    let leftHeld = false;
    function click(e: MouseEvent) {
      if (e.button != 0) return;

      e.preventDefault();
      leftHeld = true;
    }

    function clickUp(e: MouseEvent) {
      if (e.button != 0) return;

      e.preventDefault();
      leftHeld = false;
    }

    function mouseMove(e: MouseEvent) {
      if (!leftHeld) return;
      e.preventDefault();

      const we = worldEngRef.current;
      if (we == null) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (paintSizeRef.current == 0) {
        we.setCell(x, y, canvas.width, canvas.height, paintColorRef.current);
      } else {
        we.setCellRect(
          x,
          y,
          paintSizeRef.current,
          canvas.width,
          canvas.height,
          paintColorRef.current,
        );
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();
      if (e.key == "Meta") {
        const next = paintColorRef.current === 1 ? 0 : 1;
        paintColorRef.current = next;
        setPaintColor(next);
      } else if (e.key === "e") {
        requestNextStep();
        return;
      } else if (e.key === "=" || e.key === "+") {
        setPaintSize(paintSizeRef.current + 1);
        return;
      } else if (e.key === "-" || e.key === "_") {
        let p = paintSizeRef.current - 1;
        if (p < 0) p = 0;
        setPaintSize(p);
        return;
      }

      let moveFactor = 30;
      let cx = 0;
      let cy = 0;
      if (e.key === "ArrowRight" || e.key === "d") {
        cx = 1;
      } else if (e.key === "ArrowLeft" || e.key === "a") {
        cx = -1;
      } else if (e.key === "ArrowUp" || e.key === "w") {
        cy = -1;
      } else if (e.key === "ArrowDown" || e.key === "s") {
        cy = 1;
      }

      const we = worldEngRef.current;
      if (we == null) return;
      const camera = we.camera;
      camera.x += cx * moveFactor * (1 / camera.zoom);
      camera.y += cy * moveFactor * (1 / camera.zoom);
      we.renderer.render();
    }

    window.addEventListener("wheel", zoom, { passive: false });
    window.addEventListener("mousedown", click, { passive: false });
    window.addEventListener("mouseup", clickUp, { passive: false });
    window.addEventListener("mousemove", mouseMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => {
      window.removeEventListener("wheel", zoom);
      window.removeEventListener("mousedown", click);
      window.removeEventListener("mouseup", clickUp);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("keydown", handleKeyDown);
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

  const isStepPendingRef = useRef(false);

  async function requestNextStep() {
    if (isStepPendingRef.current) return;
    isStepPendingRef.current = true;

    const we = worldEngRef.current;
    if (we == null) return;
    try {
      const worldDto = await fetchNextState(1, {
        tiles: we.getTiles(),
      } as WorldDto);

      we.store.clear();
      we.setTiles(worldDto.tiles);
      setStep(stepRef.current + 1);
    } catch (err) {
      console.error(err);
    } finally {
      isStepPendingRef.current = false;
    }
  }

  return (
    <>
      <p>I will be controlling the game</p>
      <p>Brush size is {1 + paintSize * 2}</p>
      <p>You are painting {paintColor == 1 ? "alive" : "dead"} cells</p>
      <p>Current step {step} </p>
      <button onClick={handleRequestData}>Get random state</button>
      <button onClick={requestNextStep}>Get next state</button>
      <button
        onClick={() => {
          setPlay(play ? false : true);
        }}
      >
        {play ? "Pause simulation" : "Start simulation"}
      </button>
    </>
  );
}
