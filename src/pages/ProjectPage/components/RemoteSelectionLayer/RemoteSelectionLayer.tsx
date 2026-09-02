import { memo, useMemo } from "react";
import { Rect } from "react-konva";
import { useAppSelector } from "@/store";
import { selectElement } from "@/store/slices/canvas.slice";
import type { TPresenceMember } from "@/services/socket/socket.types";
import type { RootState } from "@/store/store";
import type { TRemoteSelections } from "../../hooks/useCanvasRoom.hook";

export type TRemoteSelectionLayerProps = {
  projectId: string;
  remoteSelections: TRemoteSelections;
  presenceSockets: readonly TPresenceMember[];
  selfSocketId: string | null;
};

/**
 * Dashed outlines showing what other people have selected, in their own colour.
 *
 * Geometry comes from the store rather than from the Konva nodes: reading node
 * refs during render is both unsound and wouldn't re-render when the element
 * moves.
 */
function RemoteSelectionLayer({
  projectId,
  remoteSelections,
  presenceSockets,
  selfSocketId,
}: TRemoteSelectionLayerProps) {
  /** element id -> the colour of whoever has it selected. */
  const outlines = useMemo(() => {
    const byElementId = new Map<string, string>();

    Object.entries(remoteSelections).forEach(([socketId, elementIds]) => {
      if (socketId === selfSocketId) {
        return;
      }

      const member = presenceSockets.find((entry) => entry.socketId === socketId);

      if (!member) {
        return;
      }

      elementIds.forEach((elementId) => byElementId.set(elementId, member.color));
    });

    return [...byElementId.entries()];
  }, [remoteSelections, presenceSockets, selfSocketId]);

  const elements = useAppSelector((state: RootState) =>
    outlines.map(([elementId, color]) => ({ element: selectElement(state, projectId, elementId), color })),
  );

  return (
    <>
      {elements.map(({ element, color }) => {
        if (!element) {
          return null;
        }

        return (
          <Rect
            key={`remote-selection-${element.elementId}`}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            rotation={element.rotation}
            stroke={color}
            strokeWidth={2}
            dash={[6, 4]}
            strokeScaleEnabled={false}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      })}
    </>
  );
}

export default memo(RemoteSelectionLayer);
