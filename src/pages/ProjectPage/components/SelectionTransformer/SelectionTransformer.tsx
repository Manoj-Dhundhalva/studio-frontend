import { memo, useEffect, useRef } from "react";
import { Transformer } from "react-konva";
import type Konva from "konva";
import type { Box } from "konva/lib/shapes/Transformer";
import { ELEMENT_TYPE, MIN_ELEMENT_SIZE } from "@/services/canvas/canvas.constants";
import type { TCanvasElement } from "@/services/canvas/canvas.types";

export type TSelectionTransformerProps = {
  selectedIds: readonly string[];
  selectedElements: TCanvasElement[];
  /** Live registry of element id -> Konva node, owned by `CanvasStage`. */
  nodeRegistryRef: React.RefObject<Map<string, Konva.Group>>;
  /** Bumped on add/delete, so a freshly created element gets handles. */
  revision: number;
};

/** Text resizes horizontally only, re-wrapping like a Canva text box. */
const TEXT_ANCHORS = ["middle-left", "middle-right"];

function SelectionTransformer({
  selectedIds,
  selectedElements,
  nodeRegistryRef,
  revision,
}: TSelectionTransformerProps) {
  const transformerRef = useRef<Konva.Transformer | null>(null);

  useEffect(() => {
    const transformer = transformerRef.current;

    if (!transformer) {
      return;
    }

    const nodes = selectedIds
      .map((elementId) => nodeRegistryRef.current?.get(elementId))
      .filter((node): node is Konva.Group => node !== undefined);

    transformer.nodes(nodes);
    // `revision` is in the deps because a newly added element's node isn't in
    // the registry until the render *after* `selectedIds` changes.
  }, [selectedIds, nodeRegistryRef, revision]);

  /** Rejects a resize that would collapse the element; position is otherwise free. */
  const boundBoxFunc = (oldBox: Box, newBox: Box): Box =>
    newBox.width < MIN_ELEMENT_SIZE || newBox.height < MIN_ELEMENT_SIZE ? oldBox : newBox;

  const isTextOnly = selectedElements.length === 1 && selectedElements[0]?.type === ELEMENT_TYPE.TEXT;
  const isLineOnly =
    selectedElements.length === 1 &&
    (selectedElements[0]?.type === ELEMENT_TYPE.LINE || selectedElements[0]?.type === ELEMENT_TYPE.ARROW);

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled
      flipEnabled={false}
      keepRatio={false}
      // Stroke is excluded from the box so the handles hug the geometry.
      ignoreStroke
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      rotationSnapTolerance={4}
      anchorSize={9}
      anchorCornerRadius={5}
      anchorStroke="#1677ff"
      borderStroke="#1677ff"
      borderStrokeWidth={1.5}
      padding={2}
      boundBoxFunc={boundBoxFunc}
      {...(isTextOnly || isLineOnly ? { enabledAnchors: TEXT_ANCHORS } : {})}
    />
  );
}

export default memo(SelectionTransformer);
