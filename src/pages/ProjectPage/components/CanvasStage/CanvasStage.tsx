import { memo, useCallback, useMemo, useRef } from "react";
import { Group, Layer, Rect, Stage } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useAppSelector } from "@/store";
import { selectCanvasRevision, selectElement, selectElementOrder } from "@/store/slices/canvas.slice";
import { SOCKET_EVENT, socketService } from "@/services/socket";
import type { TPresenceMember } from "@/services/socket/socket.types";
import type { TCanvas, TCanvasElement, TElementPatch } from "@/services/canvas/canvas.types";
import type { RootState } from "@/store/store";
import { createRafCoalescer } from "@/utils/rate-limit.utils";
import { toCanvasPoint } from "../../ProjectPage.utils";
import { useStageViewport } from "../../hooks/useStageViewport.hook";
import type { TRemoteSelections } from "../../hooks/useCanvasRoom.hook";
import ElementNode from "../ElementNode";
import RemoteCursorsLayer from "../RemoteCursorsLayer";
import RemoteSelectionLayer from "../RemoteSelectionLayer";
import SelectionTransformer from "../SelectionTransformer";
import EditorToolbar from "../EditorToolbar";
import styles from "./CanvasStage.module.scss";

export type TCanvasStageProps = {
  projectId: string;
  canvas: TCanvas;
  canEdit: boolean;
  selectedIds: readonly string[];
  remoteSelections: TRemoteSelections;
  presenceSockets: readonly TPresenceMember[];
  selfSocketId: string | null;
  onSelect: (elementIds: string[]) => void;
  onPreview: (elementId: string, patch: TElementPatch) => void;
  onCommit: (elementId: string, patch: TElementPatch) => void;
};

function CanvasStage({
  projectId,
  canvas,
  canEdit,
  selectedIds,
  remoteSelections,
  presenceSockets,
  selfSocketId,
  onSelect,
  onPreview,
  onCommit,
}: TCanvasStageProps) {
  const order = useAppSelector((state) => selectElementOrder(state, projectId));
  const revision = useAppSelector((state) => selectCanvasRevision(state, projectId));
  const selectedElements = useAppSelector((state: RootState) =>
    selectedIds
      .map((elementId) => selectElement(state, projectId, elementId))
      .filter((element): element is TCanvasElement => element !== null),
  );

  const canvasSize = useMemo(() => ({ width: canvas.width, height: canvas.height }), [canvas.width, canvas.height]);

  const { containerRef, viewport, scale, pan, isPanMode, fitToViewport, zoomBy, handleWheel, handleStageDragEnd } =
    useStageViewport(canvasSize);

  /** Live element id -> Konva node, read by the transformer. */
  const nodeRegistryRef = useRef<Map<string, Konva.Group>>(new Map());

  // Stable, so passing it to a memoized `ElementNode` causes no render churn.
  const registerNode = useCallback((elementId: string, node: Konva.Group | null) => {
    if (node) {
      nodeRegistryRef.current.set(elementId, node);
      return;
    }

    nodeRegistryRef.current.delete(elementId);
  }, []);

  /** Cursor broadcast, coalesced to one frame. */
  const broadcastCursor = useMemo(
    () =>
      createRafCoalescer((x: number, y: number) => {
        socketService.emit(SOCKET_EVENT.CLIENT.CURSOR_MOVE, { projectId, x, y });
      }),
    [projectId],
  );

  const handlePointerMove = useCallback(
    (event: KonvaEventObject<PointerEvent>) => {
      const stage = event.target.getStage();

      if (!stage) {
        return;
      }

      const point = toCanvasPoint(stage);

      if (point) {
        broadcastCursor(point.x, point.y);
      }
    },
    [broadcastCursor],
  );

  const handleElementSelect = useCallback(
    (elementId: string, isAdditive: boolean) => {
      if (!isAdditive) {
        onSelect([elementId]);
        return;
      }

      onSelect(
        selectedIds.includes(elementId) ? selectedIds.filter((id) => id !== elementId) : [...selectedIds, elementId],
      );
    },
    [onSelect, selectedIds],
  );

  const handleStageMouseDown = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      // Clicking empty canvas clears the selection. Element nodes set
      // `cancelBubble`, so this only fires for the background.
      if (event.target === event.target.getStage()) {
        onSelect([]);
      }
    },
    [onSelect],
  );

  return (
    <div
      ref={containerRef}
      className={styles["stage-container"] ?? ""}
      data-testid="canvas-stage"
      data-pan-mode={isPanMode ? "true" : "false"}
    >
      <Stage
        width={viewport.width}
        height={viewport.height}
        scaleX={scale}
        scaleY={scale}
        x={pan.x}
        y={pan.y}
        draggable={isPanMode}
        onWheel={handleWheel}
        onPointerMove={handlePointerMove}
        onMouseDown={handleStageMouseDown}
        onTouchStart={handleStageMouseDown}
        onDragEnd={handleStageDragEnd}
      >
        {/* 1. The artboard. Never listens — deselect is handled on the Stage. */}
        <Layer listening={false}>
          <Rect
            x={0}
            y={0}
            width={canvas.width}
            height={canvas.height}
            fill={canvas.backgroundColor}
            shadowColor="#000000"
            shadowBlur={16}
            shadowOpacity={0.12}
            shadowOffsetY={2}
          />
        </Layer>

        {/* 2. Content, clipped to the artboard so nothing paints into the void. */}
        <Layer>
          <Group clipX={0} clipY={0} clipWidth={canvas.width} clipHeight={canvas.height}>
            {order.map((elementId) => (
              <ElementNode
                key={elementId}
                projectId={projectId}
                elementId={elementId}
                canvasSize={canvasSize}
                canEdit={canEdit}
                onSelect={handleElementSelect}
                onPreview={onPreview}
                onCommit={onCommit}
                registerNode={registerNode}
              />
            ))}
          </Group>
        </Layer>

        {/* 3. Overlay. The transformer redraws every frame during a gesture, so
               keeping it off the content layer means hundreds of elements are
               not re-rasterized alongside it. */}
        <Layer>
          <RemoteSelectionLayer
            projectId={projectId}
            remoteSelections={remoteSelections}
            presenceSockets={presenceSockets}
            selfSocketId={selfSocketId}
          />

          {canEdit && (
            <SelectionTransformer
              selectedIds={selectedIds}
              selectedElements={selectedElements}
              canvasSize={canvasSize}
              nodeRegistryRef={nodeRegistryRef}
              revision={revision}
            />
          )}
        </Layer>

        {/* 4. Cursors, on their own non-listening canvas. */}
        <RemoteCursorsLayer
          members={presenceSockets}
          selfSocketId={selfSocketId}
          inverseScale={scale === 0 ? 1 : 1 / scale}
        />
      </Stage>

      <EditorToolbar
        scale={scale}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onFit={fitToViewport}
      />
    </div>
  );
}

export default memo(CanvasStage);
