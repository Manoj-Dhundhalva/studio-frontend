import { memo } from "react";
import { Arrow, Ellipse, Image as KonvaImage, Line, Rect, RegularPolygon, Star, Text } from "react-konva";
import { DEFAULT_FONT_FAMILY, ELEMENT_TYPE, type TTextAlign } from "@/services/canvas/canvas.constants";
import type { TCanvasElement } from "@/services/canvas/canvas.types";
import { useCanvasImage } from "../../hooks/useCanvasImage.hook";
import { toKonvaStyle } from "../../ProjectPage.utils";

export type TElementPrimitiveProps = {
  element: TCanvasElement;
};

/** Split out so the image hook isn't called for non-image elements. */
function ImagePrimitive({ element }: TElementPrimitiveProps) {
  const { image } = useCanvasImage(element.props.src);

  if (!image) {
    // Placeholder while loading or on failure, so the box stays selectable and
    // the transformer has something to attach to.
    return (
      <Rect
        width={element.width}
        height={element.height}
        fill="#00000010"
        stroke="#00000030"
        strokeWidth={1}
        dash={[6, 4]}
        strokeScaleEnabled={false}
      />
    );
  }

  return (
    <KonvaImage
      image={image}
      width={element.width}
      height={element.height}
      perfectDrawEnabled={false}
      strokeScaleEnabled={false}
      {...(element.cornerRadius > 0 ? { cornerRadius: element.cornerRadius } : {})}
      {...(element.stroke !== null && element.strokeWidth > 0
        ? { stroke: element.stroke, strokeWidth: element.strokeWidth }
        : {})}
    />
  );
}

/**
 * Renders one element's Konva primitive in **local box coordinates**, spanning
 * `(0,0)` to `(width, height)`.
 *
 * This uniformity is the key architectural decision here. Konva's primitives
 * disagree about geometry — `Rect` has width/height, `Ellipse` has centred
 * radii, `Star` has inner/outer radii, `RegularPolygon` has one radius, `Line`
 * has a points array. Normalising every kind into a bounding box means the
 * transformer, the drag clamp, the properties panel, the reorder logic and the
 * server payload all speak one geometry language, instead of ten special cases.
 */
function ElementPrimitive({ element }: TElementPrimitiveProps) {
  const width = element.width;
  const height = element.height;
  const style = toKonvaStyle(element);

  switch (element.type) {
    case ELEMENT_TYPE.RECT:
      return (
        <Rect
          width={width}
          height={height}
          {...(element.cornerRadius > 0 ? { cornerRadius: element.cornerRadius } : {})}
          {...style}
        />
      );

    case ELEMENT_TYPE.ELLIPSE:
      // Offset to the box centre so the group's local origin stays the box's
      // top-left, like every other kind.
      return <Ellipse x={width / 2} y={height / 2} radiusX={width / 2} radiusY={height / 2} {...style} />;

    case ELEMENT_TYPE.TRIANGLE:
      return <Line points={[width / 2, 0, width, height, 0, height]} closed {...style} />;

    case ELEMENT_TYPE.STAR:
      return (
        <Star
          x={width / 2}
          y={height / 2}
          numPoints={element.props.numPoints ?? 5}
          innerRadius={Math.min(width, height) / 4}
          outerRadius={Math.min(width, height) / 2}
          {...style}
        />
      );

    case ELEMENT_TYPE.POLYGON:
      return (
        <RegularPolygon
          x={width / 2}
          y={height / 2}
          sides={element.props.sides ?? 6}
          radius={Math.min(width, height) / 2}
          {...style}
        />
      );

    case ELEMENT_TYPE.LINE:
      return <Line points={[0, height / 2, width, height / 2]} {...style} lineCap="round" />;

    case ELEMENT_TYPE.ARROW:
      return (
        <Arrow
          points={[0, height / 2, width, height / 2]}
          pointerLength={12}
          pointerWidth={12}
          {...style}
          {...(element.stroke !== null ? { fill: element.stroke } : {})}
        />
      );

    case ELEMENT_TYPE.TEXT:
      return (
        <Text
          width={width}
          text={element.props.text ?? ""}
          fontSize={element.props.fontSize ?? 40}
          fontFamily={element.props.fontFamily ?? DEFAULT_FONT_FAMILY}
          fontStyle={element.props.fontStyle ?? "normal"}
          align={(element.props.align ?? "left") satisfies TTextAlign}
          lineHeight={element.props.lineHeight ?? 1.2}
          {...style}
        />
      );

    case ELEMENT_TYPE.ICON:
      // An icon is a single glyph, so it renders as centred text rather than
      // needing a separate asset pipeline.
      return (
        <Text
          width={width}
          height={height}
          text={element.props.text ?? ""}
          fontSize={Math.min(width, height) * 0.8}
          align="center"
          verticalAlign="middle"
        />
      );

    case ELEMENT_TYPE.IMAGE:
      return <ImagePrimitive element={element} />;

    default:
      return null;
  }
}

export default memo(ElementPrimitive);
