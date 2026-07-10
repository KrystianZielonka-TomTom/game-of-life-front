import { useEffect, useState, useRef } from "react";
import { fetchNextState, fetchRandomCells } from "../api/cells";
import type { WorldEngine } from "../hooks/useWorldEngine";
import type { WorldDto } from "../types/world";
import { styled } from "styled-components";
import {
  Box,
  Button,
  ButtonGroup,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Radio,
  RadioGroup,
  Slider,
  Switch,
} from "@mui/material";
import Card from "@mui/material/Card";

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

      if (paintSizeRef.current == 1) {
        we.setCell(x, y, canvas.width, canvas.height, paintColorRef.current);
      } else {
        we.setCellRect(
          x,
          y,
          Math.floor((paintSizeRef.current - 1) / 2 + 0.5),
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
        return;
      } else if (e.key === "e") {
        requestNextStep();
        return;
      } else if (e.key === "=" || e.key === "+") {
        let p = paintSizeRef.current - 2;
        if (p < 1) p = 1;
        setPaintSize(p);
        return;
      } else if (e.key === "-" || e.key === "_") {
        let p = paintSizeRef.current + 2;
        if (p < 1) p = 1;
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
      <Card variant="outlined">
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
          <FormControl>
            <FormLabel>Brush (size={paintSize})</FormLabel>
            <Slider
              value={paintSize}
              onChange={(_, v) => {
                setPaintSize(v as number);
              }}
              step={2}
              min={1}
              max={80}
              valueLabelDisplay="auto"
              marks
            />
            <RadioGroup
              row
              name="row-radio-buttons-group"
              value={paintColor ? "alive" : "dead"}
            >
              <FormControlLabel
                value="dead"
                control={<Radio />}
                label="Dead"
                onChange={(_, v) => {
                  setPaintColor(0);
                }}
              />
              <FormControlLabel
                value="alive"
                control={<Radio />}
                label="Alive"
                onChange={(_, v) => {
                  setPaintColor(1);
                }}
              />
            </RadioGroup>
          </FormControl>
          <div></div>
          <ButtonGroup variant="contained" aria-label="Basic button group">
            <Button onClick={handleRequestData}>Get random state</Button>
            <Button onClick={requestNextStep}>Get next state</Button>
            <Button
              onClick={() => {
                setPlay(play ? false : true);
              }}
            >
              {play ? "Pause simulation" : "Start simulation"}
            </Button>
          </ButtonGroup>
        </Box>
        <Container maxWidth="sm">
          {/* <div>Brush size is {paintSize}</div> */}
        </Container>
      </Card>
    </>
  );
}
