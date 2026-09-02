import { memo, useCallback, useEffect, useRef } from "react";
import { Group } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useAppSelector } from "@/store";
import { selectElement } from "@/store/slices/canvas.slice";
import type { TElementPatch } from "@/services/canvas/canvas.types";
import { normalizeSize } from "../../ProjectPage.utils";
import ElementPrimitive from "../ElementPrimitive";

export type TElementNodeProps = {
  canvasId: string;
  elementId: string;
  canEdit: boolean;
  onSelect: (elementId: string, isAdditive: boolean) => void;
  onPreview: (elementId: string, patch: TElementPatch) => void;
  onCommit: (elementId: string, patch: TElementPatch) => void;
  registerNode: (elementId: string, node: Konva.Group | null) => void;
};

/**
 * One element on the canvas.
 *
 * Subscribes to its own element only, so moving one element re-renders one node
 * rather than the whole tree.
 */
function ElementNode({ canvasId, elementId, canEdit, onSelect, onPreview, onCommit, registerNode }: TElementNodeProps) {
  const element = useAppSelector((state) => selectElement(state, canvasId, elementId));
  const nodeRef = useRef<Konva.Group | null>(null);

  /**
   * Read through a ref inside gesture handlers rather than closing over the
   * value, so a demotion landing between dragstart and dragend is seen by the
   * commit path. Written in an effect, never during render.
   */
  const canEditRef = useRef(canEdit);

  useEffect(() => {
    canEditRef.current = canEdit;
  }, [canEdit]);

  useEffect(() => {
    registerNode(elementId, nodeRef.current);

    return () => registerNode(elementId, null);
  }, [elementId, registerNode]);

  // If access is lost mid-gesture, stop the drag and drop any pending scale.
  useEffect(() => {
    if (canEdit) {
      return;
    }

    const node = nodeRef.current;

    if (!node) {
      return;
    }

    if (node.isDragging()) {
      node.stopDrag();
    }

    node.scaleX(1);
    node.scaleY(1);
  }, [canEdit]);

  const handleDragMove = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      onPreview(elementId, { x: event.target.x(), y: event.target.y() });
    },
    [elementId, onPreview],
  );

  const handleDragEnd = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      if (!canEditRef.current) {
        return;
      }

      onCommit(elementId, { x: Math.round(event.target.x()), y: Math.round(event.target.y()) });
    },
    [elementId, onCommit],
  );

  const handleTransform = useCallback(() => {
    const node = nodeRef.current;

    if (!node || !element) {
      return;
    }

    // Live preview during the gesture. Konva owns the visual state here, so this
    // only feeds the network, not Redux.
    onPreview(elementId, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: normalizeSize(element.width * node.scaleX()),
      height: normalizeSize(element.height * node.scaleY()),
    });
  }, [element, elementId, onPreview]);

  const handleTransformEnd = useCallback(() => {
    const node = nodeRef.current;

    if (!node || !element || !canEditRef.current) {
      return;
    }

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    /**
     * Konva's Transformer mutates `scaleX`/`scaleY`; it never changes
     * width/height. Reset BEFORE committing so the next paint uses real
     * dimensions and there's no one-frame flash of a double-scaled element.
     * Leaving the scale in place would compound multiplicatively on every
     * subsequent resize.
     */
    node.scaleX(1);
    node.scaleY(1);

    /**
     * Multiplying the *stored* width, not `node.width()`: a Konva `Group`
     * reports `width() === 0`, so `node.width() * scaleX` would silently
     * collapse every element to zero size.
     */
    onCommit(elementId, {
      x: Math.round(node.x()),
      y: Math.round(node.y()),
      rotation: Math.round(node.rotation() * 100) / 100,
      width: normalizeSize(element.width * scaleX),
      height: normalizeSize(element.height * scaleY),
    });
  }, [element, elementId, onCommit]);

  const handleSelect = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      // Stop the stage's own click handler from immediately deselecting.
      event.cancelBubble = true;
      onSelect(elementId, event.evt.shiftKey || event.evt.metaKey || event.evt.ctrlKey);
    },
    [elementId, onSelect],
  );

  if (!element) {
    return null;
  }

  return (
    <Group
      ref={(node) => {
        nodeRef.current = node;
        registerNode(elementId, node);
      }}
      id={element.elementId}
      name={element.type}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      opacity={element.opacity}
      draggable={canEdit}
      onMouseDown={handleSelect}
      onTouchStart={handleSelect}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onTransform={handleTransform}
      onTransformEnd={handleTransformEnd}
      // Selected elements keep pointer priority; unselected ones still listen so
      // viewers can click to inspect.
      listening
    >
      <ElementPrimitive element={element} />
    </Group>
  );
}

export default memo(ElementNode);
