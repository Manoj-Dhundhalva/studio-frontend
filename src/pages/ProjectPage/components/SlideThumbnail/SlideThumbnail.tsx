import { memo, useCallback, useEffect, useRef } from "react";
import { Group, Layer, Rect, Stage } from "react-konva";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Popconfirm, Skeleton } from "antd";
import { CopyOutlined, DeleteOutlined } from "@ant-design/icons";
import { useAppSelector } from "@/store";
import { selectCanvas, selectElement, selectElementOrder } from "@/store/slices/canvas.slice";
import type { TCanvasElement } from "@/services/canvas/canvas.types";
import type { RootState } from "@/store/store";
import ElementPrimitive from "../ElementPrimitive";
import styles from "./SlideThumbnail.module.scss";

const THUMB_WIDTH = 150;
const THUMB_HEIGHT = 90;

export type TSlideThumbnailProps = {
  canvasId: string;
  index: number;
  isActive: boolean;
  canEdit: boolean;
  onSelect: (canvasId: string) => void;
  onDuplicate: (canvasId: string) => void;
  onDelete: (canvasId: string) => void;
  /** Fires once, on mount, if this slide's elements haven't been fetched yet — backfills a blank thumbnail. */
  onEnsureHydrated: (canvasId: string) => void;
};

/**
 * One slide's live preview: a small read-only Konva `Stage` reusing
 * `ElementPrimitive`, the same renderer `CanvasStage` uses — so a thumbnail is
 * never a second implementation of "how does an element look" drifting from
 * the real canvas.
 */
function SlideThumbnail({
  canvasId,
  index,
  isActive,
  canEdit,
  onSelect,
  onDuplicate,
  onDelete,
  onEnsureHydrated,
}: TSlideThumbnailProps) {
  const canvas = useAppSelector((state) => selectCanvas(state, canvasId));
  const order = useAppSelector((state) => selectElementOrder(state, canvasId));
  const elements = useAppSelector((state: RootState) =>
    order
      .map((elementId) => selectElement(state, canvasId, elementId))
      .filter((element): element is TCanvasElement => element !== null),
  );

  useEffect(() => {
    onEnsureHydrated(canvasId);
    // Only ever needs to fire once per slide id — re-running on every render
    // would just re-check a cache hit, but there's no reason to pay for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: canvasId,
    disabled: !canEdit,
  });

  // The strip scrolls horizontally, so a slide created or duplicated outside the
  // current scroll position (e.g. duplicating an off-screen slide) would otherwise
  // become the active slide with no visible change — looking like the action did
  // nothing. Scroll it into view whenever it becomes active.
  const elementRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useCallback(
    (node: HTMLDivElement | null) => {
      elementRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );

  useEffect(() => {
    if (isActive) {
      elementRef.current?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
    }
  }, [isActive, canvasId]);

  const rootStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleDuplicate = (event: React.MouseEvent): void => {
    event.stopPropagation();
    onDuplicate(canvasId);
  };

  const handleDeleteClick = (event: React.MouseEvent): void => {
    event.stopPropagation();
  };

  if (!canvas) {
    return (
      <div ref={rootRef} style={rootStyle} className={styles["thumb"] ?? ""} data-testid={`slide-thumbnail-${index}`}>
        <Skeleton.Button active size="small" className={styles["skeleton"] ?? ""} />
      </div>
    );
  }

  const scale = Math.min(THUMB_WIDTH / canvas.width, THUMB_HEIGHT / canvas.height);
  const offsetX = (THUMB_WIDTH - canvas.width * scale) / 2;
  const offsetY = (THUMB_HEIGHT - canvas.height * scale) / 2;

  return (
    <div
      ref={rootRef}
      style={rootStyle}
      {...attributes}
      {...listeners}
      className={[styles["thumb"], isActive ? styles["active"] : ""].filter(Boolean).join(" ")}
      onClick={() => onSelect(canvasId)}
      data-testid={`slide-thumbnail-${index}`}
    >
      <Stage width={THUMB_WIDTH} height={THUMB_HEIGHT} listening={false}>
        <Layer listening={false}>
          <Rect x={0} y={0} width={THUMB_WIDTH} height={THUMB_HEIGHT} fill="#e8e8e8" />
          <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale} listening={false}>
            <Rect
              x={0}
              y={0}
              width={canvas.width}
              height={canvas.height}
              fill={canvas.backgroundColor}
              shadowColor="#000000"
              shadowBlur={4}
              shadowOpacity={0.15}
            />
            {elements.map((element) => (
              <Group
                key={element.elementId}
                x={element.x}
                y={element.y}
                rotation={element.rotation}
                opacity={element.opacity}
                listening={false}
              >
                <ElementPrimitive element={element} />
              </Group>
            ))}
          </Group>
        </Layer>
      </Stage>

      <div className={styles["label"] ?? ""}>{index + 1}</div>

      {canEdit && (
        // This pill always sits on the slide's own (near-always light) canvas
        // background, not the app chrome — so its icons are colored explicitly
        // rather than inheriting the app theme, which made them near-invisible
        // (light-on-light) in dark mode.
        <div className={styles["actions"] ?? ""}>
          <Button
            size="small"
            type="text"
            icon={<CopyOutlined />}
            onClick={handleDuplicate}
            aria-label="Duplicate slide"
            style={{ color: "rgba(0, 0, 0, 0.65)" }}
          />
          <Popconfirm
            title="Delete this slide?"
            onConfirm={() => onDelete(canvasId)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={handleDeleteClick}
              aria-label="Delete slide"
              style={{ color: "#ff4d4f" }}
            />
          </Popconfirm>
        </div>
      )}
    </div>
  );
}

export default memo(SlideThumbnail);
