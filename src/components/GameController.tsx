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
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
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
  const [activeChunks, setActiveChunks] = useState<number>(0);
  const [renderTime, setRenderTime] = useState<number>(0);
  const [requestTime, setRequestTime] = useState<number>(0);
  const [storeHeat, setStoreHeat] = useState<boolean>(false);
  const [showHeat, setShowHeat] = useState<boolean>(false);

  const paintColorRef = useRef(1);
  const paintSizeRef = useRef(1);
  const stepRef = useRef(0);
  const lastStepTimestampRef = useRef<number | null>(null);
  const isStepPendingRef = useRef(false);
  const stepsPerSecRef = useRef<number>(0);
  const storeHeatRef = useRef<boolean>(false);
  const showHeatRef = useRef<boolean>(false);

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
    stepsPerSecRef.current = stepsPerSec;
  }, [stepsPerSec]);

  useEffect(() => {
    storeHeatRef.current = storeHeat;
  }, [storeHeat]);

  useEffect(() => {
    const we = worldEngRef.current;
    if (we == null) return;
    if (showHeat) {
      we.renderer.enableHeatMap = true;
    } else {
      we.renderer.enableHeatMap = false;
    }
    we.renderer.invalidateRegion();
    we.renderer.render();
  }, [showHeat]);

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

      let moveFactor = 80;
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

    const spsBefore = stepsPerSecRef.current;
    setStepsPerSec(0);

    const timingDto = await fetchRandomCells(x, y, width, height);

    setTimeout(function () {
      updateTiming(timingDto.stepMs, timingDto.loadingMs);

      we.setTiles(timingDto.response.tiles);
      setActiveChunks(we.getActiveChunkCount());
      setStep(stepRef.current + 1);
      setStepsPerSec(spsBefore);
    }, 300);
  }

  async function reqNext(we: WorldEngine) {
    let before = performance.now();
    const timingDto = await fetchNextState(1, {
      tiles: we.getTiles(),
    } as WorldDto);
    setRequestTime(performance.now() - before);

    before = performance.now();
    if (storeHeatRef.current) {
      we.calcHeat(timingDto.response.tiles);
    }
    we.clearStore();
    we.setTiles(timingDto.response.tiles);
    updateTiming(timingDto.stepMs, timingDto.loadingMs);
    setActiveChunks(we.getActiveChunkCount());
    setStep(stepRef.current + 1);
    setRenderTime(performance.now() - before);
  }

  async function handleRequestData(f: (we: WorldEngine) => void) {
    if (isStepPendingRef.current) return;
    isStepPendingRef.current = true;

    const we = worldEngRef.current;
    if (we == null) return;
    try {
      await f(we);

      const now = performance.now();
      const lastTimestamp = lastStepTimestampRef.current;
      if (lastTimestamp != null) {
        const d = now - lastTimestamp;
        if (d > 0) {
          const inv = 1000 / d;
          setActStepsPerSec((prev) =>
            prev == null ? inv : prev + 0.1 * (inv - prev),
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
                <FormControlLabel
                  checked={showHeat}
                  onChange={(_, v) => setShowHeat(v)}
                  control={<Checkbox />}
                  label="Show heat"
                ></FormControlLabel>
                <FormControlLabel
                  checked={storeHeat}
                  onChange={(_, v) => setStoreHeat(v)}
                  control={<Checkbox />}
                  label="Store heat"
                ></FormControlLabel>
              </RadioGroup>
            </Box>
            <Box sx={{ flex: 1, minWidth: 220 }}>
              <Typography>Simulation</Typography>
              <FormControl fullWidth>
                <Stack spacing={2}>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
                    <FormLabel>
                      Speed {stepsPerSec} steps/s{" "}
                      {actStepsPerSec == null
                        ? "-"
                        : `(Actual ${actStepsPerSec.toFixed(1)} steps/s)`}
                    </FormLabel>
                    <FormLabel>
                      {timingData == null
                        ? "-"
                        : `Load:${timingData.loadingMs}ms Step:${timingData.stepsMs}ms`}
                      {` Render:${Math.floor(renderTime)}ms`}
                      {` Request:${Math.floor(requestTime)}ms`}
                    </FormLabel>
                    <FormLabel>
                      {sizeData == null
                        ? "-"
                        : `Game board width: ${sizeData.width} height: ${sizeData.height}`}
                    </FormLabel>
                    <FormLabel>Active chunks: {activeChunks}</FormLabel>
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
              <div></div>

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
