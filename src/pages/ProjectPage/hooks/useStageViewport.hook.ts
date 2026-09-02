import { useCallback, useEffect, useRef, useState } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { ZOOM } from "@/services/canvas/canvas.constants";
import type { TPoint, TSize } from "@/services/canvas/canvas.types";
import { clamp } from "@/utils/rate-limit.utils";
import { getFitPan, getFitScale } from "../ProjectPage.utils";

type TUseStageViewportResult = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewport: TSize;
  scale: number;
  pan: TPoint;
  isPanMode: boolean;
  fitToViewport: () => void;
  zoomBy: (factor: number) => void;
  setZoom: (next: number) => void;
  handleWheel: (event: KonvaEventObject<WheelEvent>) => void;
  handleStageDragEnd: (event: KonvaEventObject<DragEvent>) => void;
};

/**
 * Owns per-user view state: zoom, pan, and the measured viewport.
 *
 * Deliberately local `useState` rather than Redux — this changes on every wheel
 * tick and is nobody else's business.
 */
export const useStageViewport = (canvasSize: TSize): TUseStageViewportResult => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<TSize>({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<TPoint>({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState(false);

  /**
   * Which (viewport, canvas) combination has already been auto-fitted. Without
   * this, every window resize would yank the user's manual zoom back to fit.
   */
  const fittedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;
      setViewport({ width, height });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const fitToViewport = useCallback(() => {
    if (viewport.width <= 0 || viewport.height <= 0) {
      return;
    }

    const nextScale = getFitScale(viewport, canvasSize);
    setScale(nextScale);
    setPan(getFitPan(viewport, canvasSize, nextScale));
  }, [viewport, canvasSize]);

  // Auto-fit once per canvas size, and once the viewport is first measured.
  useEffect(() => {
    if (viewport.width <= 0 || viewport.height <= 0) {
      return;
    }

    const key = `${canvasSize.width}x${canvasSize.height}`;

    if (fittedKeyRef.current === key) {
      return;
    }

    fittedKeyRef.current = key;
    fitToViewport();
  }, [viewport, canvasSize, fitToViewport]);

  // Space holds pan mode, matching the convention in every design tool.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        setIsPanMode(true);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsPanMode(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      setScale((current) => {
        const next = clamp(current * factor, ZOOM.MIN, ZOOM.MAX);

        // Zoom about the viewport centre so the artboard doesn't drift off.
        setPan((currentPan) => ({
          x: viewport.width / 2 - ((viewport.width / 2 - currentPan.x) / current) * next,
          y: viewport.height / 2 - ((viewport.height / 2 - currentPan.y) / current) * next,
        }));

        return next;
      });
    },
    [viewport],
  );

  const setZoom = useCallback(
    (next: number) => {
      const clamped = clamp(next, ZOOM.MIN, ZOOM.MAX);
      setScale(clamped);
      setPan(getFitPan(viewport, canvasSize, clamped));
    },
    [viewport, canvasSize],
  );

  const handleWheel = useCallback((event: KonvaEventObject<WheelEvent>) => {
    // Works because Konva binds `wheel` natively (non-passive) on the container
    // rather than through React's synthetic delegation.
    event.evt.preventDefault();

    const stage: Konva.Stage | null = event.target.getStage();
    const pointer = stage?.getPointerPosition();

    if (!stage || !pointer) {
      return;
    }

    // Plain wheel pans; ctrl/⌘ (and trackpad pinch, which reports ctrlKey) zooms.
    if (!event.evt.ctrlKey && !event.evt.metaKey) {
      setPan((current) => ({ x: current.x - event.evt.deltaX, y: current.y - event.evt.deltaY }));
      return;
    }

    const oldScale = stage.scaleX();
    const next = clamp(oldScale * Math.pow(ZOOM.STEP, -event.evt.deltaY / 100), ZOOM.MIN, ZOOM.MAX);

    setScale(next);
    // Keeps the point under the cursor fixed while scaling.
    setPan({
      x: pointer.x - ((pointer.x - stage.x()) / oldScale) * next,
      y: pointer.y - ((pointer.y - stage.y()) / oldScale) * next,
    });
  }, []);

  const handleStageDragEnd = useCallback((event: KonvaEventObject<DragEvent>) => {
    const stage = event.target.getStage();

    // Only the stage itself panning should write back — a dragged element also
    // bubbles its dragend here.
    if (!stage || event.target !== stage) {
      return;
    }

    setPan({ x: stage.x(), y: stage.y() });
  }, []);

  return {
    containerRef,
    viewport,
    scale,
    pan,
    isPanMode,
    fitToViewport,
    zoomBy,
    setZoom,
    handleWheel,
    handleStageDragEnd,
  };
};
