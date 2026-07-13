import { useEffect, useState, useRef } from "react";
import { fetchNextState, fetchRandomCells } from "../api/cells";
import type { WorldEngine } from "../hooks/useWorldEngine";
import type { WorldDto } from "../types/world";
import { styled } from "styled-components";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Typography,
} from "@mui/material";

interface Timing {
  stepsMs: number;
  loadingMs: number;
}

interface SizeData {
  width: number;
  height: number;
}

export default function GameController({
  canvasRef,
  worldEngRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  worldEngRef: React.RefObject<WorldEngine | null>;
}) {
  const [paintSize, setPaintSize] = useState<number>(1);
  const [paintColor, setPaintColor] = useState<number>(1);
  const [step, setStep] = useState<number>(0);
  const [stepsPerSec, setStepsPerSec] = useState<number>(0);
  const [actStepsPerSec, setActStepsPerSec] = useState<number | null>(null);
  const [timingData, setTimingData] = useState<Timing | null>(null);
  const [sizeData, setSizeData] = useState<SizeData | null>(null);

  const paintColorRef = useRef(1);
  const paintSizeRef = useRef(1);
  const stepRef = useRef(0);
  const lastStepTimestampRef = useRef<number | null>(null);
  const isStepPendingRef = useRef(false);

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
    if (stepsPerSec == 0) return;
    const id = setInterval(() => {
      handleRequestData(reqNext);
    }, 1000 / stepsPerSec);

    lastStepTimestampRef.current = null;

    return () => clearInterval(id);
  }, [stepsPerSec]);

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
      updateSizeDisplay(canvas, we);
    }

    let leftHeld = false;
    function click(e: MouseEvent) {
      if (e.button != 0) return;

      e.preventDefault();

      const we = worldEngRef.current;
      if (we == null) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      paint(x, y, we);

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
      paint(x, y, we);
    }

    function paint(x: number, y: number, we: WorldEngine) {
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
        handleRequestData(reqNext);
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

    canvas.addEventListener("wheel", zoom, { passive: false });
    canvas.addEventListener("mousedown", click, { passive: false });
    window.addEventListener("mouseup", clickUp, { passive: false });
    window.addEventListener("mousemove", mouseMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", zoom);
      canvas.removeEventListener("mousedown", click);
      window.removeEventListener("mouseup", clickUp);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function updateTiming(stepMs: number, loadingMs: number) {
    setTimingData({ stepsMs: stepMs, loadingMs: loadingMs });
  }

  async function reqRandom(we: WorldEngine) {
    const c = canvasRef.current;
    if (c == null) return;

    const rect = c.getBoundingClientRect();
    const corner1 = we.camera.screenToWorld(rect.x, rect.y, c.width, c.height);
    const corner2 = we.camera.screenToWorld(
      rect.x + rect.width,
      rect.y + rect.height,
      c.width,
      c.height,
    );

    const x = corner1.wx;
    const y = corner1.wy;
    const width = corner2.wx - corner1.wx;
    const height = corner2.wy - corner1.wy;

    const timingDto = await fetchRandomCells(x, y, width, height);
    updateTiming(timingDto.stepMs, timingDto.loadingMs);

    we.setTiles(timingDto.response.tiles);
    setStep(stepRef.current + 1);
  }

  async function reqNext(we: WorldEngine) {
    const timingDto = await fetchNextState(1, {
      tiles: we.getTiles(),
    } as WorldDto);

    we.store.clear();
    updateTiming(timingDto.stepMs, timingDto.loadingMs);

    we.setTiles(timingDto.response.tiles);
    setStep(stepRef.current + 1);
  }

  async function handleRequestData(f: (we: WorldEngine) => void) {
    if (isStepPendingRef.current) return;
    isStepPendingRef.current = true;

    const we = worldEngRef.current;
    if (we == null) return;
    try {
      f(we);

      const now = performance.now();
      const lastTimestamp = lastStepTimestampRef.current;
      if (lastTimestamp != null) {
        const d = now - lastTimestamp;
        if (d > 0) {
          const inv = 1000 / d;
          setActStepsPerSec((prev) =>
            prev == null ? inv : prev + 0.3 * (inv - prev),
          );
        }
      }
      lastStepTimestampRef.current = now;
    } catch (err) {
      console.error(err);
    } finally {
      isStepPendingRef.current = false;
    }
  }

  function updateSizeDisplay(c: HTMLCanvasElement, we: WorldEngine) {
    const rect = c.getBoundingClientRect();
    const corner1 = we.camera.screenToWorld(rect.x, rect.y, c.width, c.height);
    const corner2 = we.camera.screenToWorld(
      rect.x + rect.width,
      rect.y + rect.height,
      c.width,
      c.height,
    );
    const width = Math.floor(corner2.wx - corner1.wx);
    const height = Math.floor(corner2.wy - corner1.wy);
    setSizeData({ width: width, height: height });
  }

  return (
    <>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={10}>
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Typography>Brush</Typography>
              <FormControl fullWidth>
                <FormLabel>Size {paintSize}</FormLabel>
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
              </FormControl>
              <RadioGroup
                row
                name="row-radio-buttons-group"
                value={paintColor ? "alive" : "dead"}
                sx={{ mt: 1 }}
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
            </Box>
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Typography>Simulation</Typography>
              <FormControl fullWidth>
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={10}>
                    <FormLabel>
                      Speed {stepsPerSec} steps/s{" "}
                      {actStepsPerSec == null
                        ? "-"
                        : `${actStepsPerSec.toFixed(1)} steps/s`}
                    </FormLabel>
                    <FormLabel>
                      {timingData == null
                        ? "-"
                        : `Load: ${timingData.loadingMs}ms Simulation step: ${timingData.stepsMs}ms`}
                    </FormLabel>
                    <FormLabel>
                      {sizeData == null
                        ? "-"
                        : `width: ${sizeData.width} height: ${sizeData.height}`}
                    </FormLabel>
                  </Stack>
                </Stack>
                <Slider
                  value={stepsPerSec}
                  onChange={(_, v) => {
                    setStepsPerSec(v as number);
                  }}
                  step={0.5}
                  min={0}
                  max={30}
                  valueLabelDisplay="auto"
                  marks
                />
              </FormControl>
              <Typography variant="caption">Step {step}</Typography>
              <Divider></Divider>

              <ButtonGroup variant="contained" aria-label="Sim controls">
                <Button
                  onClick={(_) => {
                    handleRequestData(reqRandom);
                  }}
                >
                  Get random state
                </Button>
                <Button
                  onClick={(_) => {
                    handleRequestData(reqNext);
                  }}
                >
                  Get next state (e)
                </Button>
              </ButtonGroup>
            </Box>
          </Stack>
        </Stack>
      </Card>
    </>
  );
}
