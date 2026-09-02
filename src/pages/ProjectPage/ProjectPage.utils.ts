import type Konva from "konva";
import {
  DEFAULT_ELEMENT_STYLE,
  DEFAULT_FONT_FAMILY,
  ELEMENT_DEFAULT_SIZE,
  ELEMENT_TYPE,
  MIN_ELEMENT_SIZE,
  ZOOM,
  type TElementType,
} from "@/services/canvas/canvas.constants";
import type { TCanvasElement, TElementCreateInput, TElementProps, TPoint, TSize } from "@/services/canvas/canvas.types";
import { clamp } from "@/utils/rate-limit.utils";

/** Canvas pixels each successive insert is offset by, so they don't stack exactly. */
const INSERT_CASCADE_STEP = 28;

/** Scale that fits the whole workspace inside the viewport, with a margin. */
export const getFitScale = (viewport: TSize, canvas: TSize): number => {
  if (viewport.width <= 0 || viewport.height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
    return 1;
  }

  return clamp(
    Math.min(
      (viewport.width - ZOOM.FIT_PADDING * 2) / canvas.width,
      (viewport.height - ZOOM.FIT_PADDING * 2) / canvas.height,
    ),
    ZOOM.MIN,
    ZOOM.MAX,
  );
};

/** Stage offset that centres the workspace at a given scale. */
export const getFitPan = (viewport: TSize, canvas: TSize, scale: number): TPoint => ({
  x: (viewport.width - canvas.width * scale) / 2,
  y: (viewport.height - canvas.height * scale) / 2,
});

/**
 * Pointer position in *artboard* pixels.
 *
 * Inverting the stage's absolute transform removes zoom and pan in one step, so
 * the result is zoom-independent. That is what lets a peer at 40% zoom and a
 * peer at 200% see each other's cursor over the same element.
 */
export const toCanvasPoint = (stage: Konva.Stage): TPoint | null => {
  const pointer = stage.getPointerPosition();

  if (!pointer) {
    return null;
  }

  const transform = stage.getAbsoluteTransform().copy().invert();
  const { x, y } = transform.point(pointer);

  return { x, y };
};

/** Per-type extra props for a newly inserted element. */
const defaultPropsFor = (type: TElementType, size: TSize): TElementProps => {
  switch (type) {
    case ELEMENT_TYPE.TEXT:
      return {
        text: "Add your text",
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: 40,
        fontStyle: "normal",
        align: "left",
        lineHeight: 1.2,
      };
    case ELEMENT_TYPE.STAR:
      return { numPoints: 5, innerRadius: Math.min(size.width, size.height) / 4 };
    case ELEMENT_TYPE.POLYGON:
      return { sides: 6 };
    case ELEMENT_TYPE.LINE:
    case ELEMENT_TYPE.ARROW:
      return { points: [0, 0, size.width, 0] };
    default:
      return {};
  }
};

/**
 * Builds a new element centred in the workspace.
 *
 * The id is minted here, client-side, so the element can be rendered and
 * selected immediately under its final id — with a server-assigned id the
 * transformer and selection state would have to be re-keyed on the ack.
 */
export const createElementInput = (
  type: TElementType,
  canvas: TSize,
  overrides?: Partial<TElementCreateInput>,
  /**
   * How many elements are already on the canvas. Used to cascade each insert a
   * little down-right of the last, so adding several in a row leaves them
   * individually grabbable instead of in one exactly-overlapping pile.
   */
  existingCount = 0,
): TElementCreateInput => {
  const size = ELEMENT_DEFAULT_SIZE[type];
  const width = overrides?.width ?? size.width;
  const height = overrides?.height ?? size.height;

  const isStroked = type === ELEMENT_TYPE.LINE || type === ELEMENT_TYPE.ARROW;

  // Wraps after 8 so the cascade can't march an element off the workspace.
  const offset = (existingCount % 8) * INSERT_CASCADE_STEP;

  const centeredX = Math.round((canvas.width - width) / 2) + offset;
  const centeredY = Math.round((canvas.height - height) / 2) + offset;

  return {
    elementId: crypto.randomUUID(),
    type,
    // Still clamped, so the cascade never pushes an element outside the bounds.
    x: clamp(centeredX, 0, Math.max(0, canvas.width - width)),
    y: clamp(centeredY, 0, Math.max(0, canvas.height - height)),
    width,
    height,
    rotation: DEFAULT_ELEMENT_STYLE.rotation,
    opacity: DEFAULT_ELEMENT_STYLE.opacity,
    // A line has no area to fill, so it carries its colour on the stroke.
    fill: isStroked ? null : (overrides?.fill ?? DEFAULT_ELEMENT_STYLE.fill),
    stroke: isStroked ? DEFAULT_ELEMENT_STYLE.fill : null,
    strokeWidth: isStroked ? 4 : DEFAULT_ELEMENT_STYLE.strokeWidth,
    cornerRadius: 0,
    props: { ...defaultPropsFor(type, { width, height }), ...overrides?.props },
    ...(overrides?.x !== undefined ? { x: overrides.x } : {}),
    ...(overrides?.y !== undefined ? { y: overrides.y } : {}),
  };
};

/**
 * Konva shape config for an element.
 *
 * Konva's `ShapeConfig` declares optionals as `prop?: T` without `| undefined`,
 * so under `exactOptionalPropertyTypes` passing an explicit `undefined` is a
 * type error. Building the config by conditional spread here keeps every
 * primitive branch free of that guard noise.
 *
 * Opacity is deliberately absent here: `ElementNode` already applies
 * `element.opacity` to the wrapping `Group`, and Konva compounds a parent's
 * opacity with a child's multiplicatively. Setting it again on the shape
 * would silently square it (0.5 -> 0.25 on screen).
 */
export const toKonvaStyle = (element: TCanvasElement): Konva.ShapeConfig => ({
  ...(element.fill !== null ? { fill: element.fill } : {}),
  ...(element.stroke !== null && element.strokeWidth > 0
    ? { stroke: element.stroke, strokeWidth: element.strokeWidth }
    : {}),
  // Keeps stroke weight constant while the transformer scales the node, so the
  // border doesn't visibly fatten mid-resize and snap back on release.
  strokeScaleEnabled: false,
  // Both are expensive off-screen-buffer paths and invisible at editor fidelity.
  perfectDrawEnabled: false,
  shadowForStrokeEnabled: false,
});

/** Guards against a degenerate box during a transform. */
export const normalizeSize = (value: number): number => Math.max(MIN_ELEMENT_SIZE, Math.round(value));

/** Next zIndex values to send a selection to the front or back of the stack. */
export const buildReorder = (
  order: readonly string[],
  selectedIds: readonly string[],
  direction: "front" | "back",
): { elementId: string; zIndex: number }[] => {
  const selected = new Set(selectedIds);
  const others = order.filter((elementId) => !selected.has(elementId));
  const moved = order.filter((elementId) => selected.has(elementId));

  const next = direction === "front" ? [...others, ...moved] : [...moved, ...others];

  return next.map((elementId, index) => ({ elementId, zIndex: index }));
};
