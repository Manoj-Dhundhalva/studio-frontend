import Konva from "konva";

import type { TCanvas, TCanvasElement } from "@/services/canvas/canvas.types";
import { DEFAULT_FONT_FAMILY, ELEMENT_TYPE } from "@/services/canvas/canvas.constants";

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    // Abort slow loads so export doesn't hang
    setTimeout(() => resolve(null), 8000);
    img.src = src;
  });
}

/**
 * Renders a slide off-screen using the programmatic Konva API and returns its
 * data URL. Does not need or touch the live editor stage — it creates a temporary
 * DOM container, draws into it, captures, then tears down.
 */
export async function renderSlideToDataURL(
  canvas: TCanvas,
  elements: TCanvasElement[],
  format: "image/png" | "image/jpeg" = "image/png",
  pixelRatio = 2,
): Promise<string> {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-99999px;top:-99999px;width:1px;height:1px;overflow:hidden;pointer-events:none;";
  document.body.appendChild(container);

  try {
    const stage = new Konva.Stage({ container, width: canvas.width, height: canvas.height });

    // Layer 1: solid background
    const bgLayer = new Konva.Layer();
    stage.add(bgLayer);
    bgLayer.add(
      new Konva.Rect({ x: 0, y: 0, width: canvas.width, height: canvas.height, fill: canvas.backgroundColor }),
    );

    // Layer 2: elements
    const contentLayer = new Konva.Layer();
    stage.add(contentLayer);

    // Pre-load all images before drawing so the canvas isn't tainted mid-render.
    const imageMap = new Map<string, HTMLImageElement>();
    await Promise.all(
      elements
        .filter((el) => el.type === ELEMENT_TYPE.IMAGE && el.props.src)
        .map(async (el) => {
          const img = await loadImage(el.props.src!);
          if (img) imageMap.set(el.elementId, img);
        }),
    );

    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    for (const el of sorted) {
      const group = new Konva.Group({ x: el.x, y: el.y, rotation: el.rotation, opacity: el.opacity });

      const styleAttrs: Konva.ShapeConfig = {
        ...(el.fill !== null ? { fill: el.fill } : {}),
        ...(el.stroke !== null && el.strokeWidth > 0 ? { stroke: el.stroke, strokeWidth: el.strokeWidth } : {}),
      };

      let shape: Konva.Shape | null = null;

      switch (el.type) {
        case ELEMENT_TYPE.RECT:
          shape = new Konva.Rect({
            width: el.width,
            height: el.height,
            ...(el.cornerRadius > 0 ? { cornerRadius: el.cornerRadius } : {}),
            ...styleAttrs,
          });
          break;

        case ELEMENT_TYPE.ELLIPSE:
          shape = new Konva.Ellipse({
            x: el.width / 2,
            y: el.height / 2,
            radiusX: el.width / 2,
            radiusY: el.height / 2,
            ...styleAttrs,
          });
          break;

        case ELEMENT_TYPE.TRIANGLE:
          shape = new Konva.Line({
            points: [el.width / 2, 0, el.width, el.height, 0, el.height],
            closed: true,
            ...styleAttrs,
          });
          break;

        case ELEMENT_TYPE.STAR:
          shape = new Konva.Star({
            x: el.width / 2,
            y: el.height / 2,
            numPoints: el.props.numPoints ?? 5,
            innerRadius: Math.min(el.width, el.height) / 4,
            outerRadius: Math.min(el.width, el.height) / 2,
            ...styleAttrs,
          });
          break;

        case ELEMENT_TYPE.POLYGON:
          shape = new Konva.RegularPolygon({
            x: el.width / 2,
            y: el.height / 2,
            sides: el.props.sides ?? 6,
            radius: Math.min(el.width, el.height) / 2,
            ...styleAttrs,
          });
          break;

        case ELEMENT_TYPE.LINE:
          shape = new Konva.Line({
            points: [0, el.height / 2, el.width, el.height / 2],
            lineCap: "round",
            ...styleAttrs,
          });
          break;

        case ELEMENT_TYPE.ARROW:
          shape = new Konva.Arrow({
            points: [0, el.height / 2, el.width, el.height / 2],
            pointerLength: 12,
            pointerWidth: 12,
            ...styleAttrs,
            // Arrow fill follows stroke color (matches ElementPrimitive behaviour)
            ...(el.stroke !== null ? { fill: el.stroke } : {}),
          });
          break;

        case ELEMENT_TYPE.TEXT:
          shape = new Konva.Text({
            width: el.width,
            text: el.props.text ?? "",
            fontSize: el.props.fontSize ?? 40,
            fontFamily: el.props.fontFamily ?? DEFAULT_FONT_FAMILY,
            fontStyle: el.props.fontStyle ?? "normal",
            align: el.props.align ?? "left",
            lineHeight: el.props.lineHeight ?? 1.2,
            ...styleAttrs,
          });
          break;

        case ELEMENT_TYPE.ICON:
          shape = new Konva.Text({
            width: el.width,
            height: el.height,
            text: el.props.text ?? "",
            fontSize: Math.min(el.width, el.height) * 0.8,
            align: "center",
            verticalAlign: "middle",
            ...(el.fill !== null ? { fill: el.fill } : {}),
          });
          break;

        case ELEMENT_TYPE.IMAGE: {
          const htmlImg = imageMap.get(el.elementId);
          if (htmlImg) {
            shape = new Konva.Image({
              image: htmlImg,
              width: el.width,
              height: el.height,
              ...(el.cornerRadius > 0 ? { cornerRadius: el.cornerRadius } : {}),
              ...(el.stroke !== null && el.strokeWidth > 0 ? { stroke: el.stroke, strokeWidth: el.strokeWidth } : {}),
            });
          }
          break;
        }
      }

      if (shape) {
        group.add(shape);
        contentLayer.add(group);
      }
    }

    const dataURL = stage.toDataURL({
      mimeType: format,
      quality: format === "image/jpeg" ? 0.92 : 1,
      pixelRatio,
    });

    stage.destroy();
    return dataURL;
  } finally {
    document.body.removeChild(container);
  }
}

export function downloadDataURL(dataURL: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
