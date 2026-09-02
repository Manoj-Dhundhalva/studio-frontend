import { memo, useCallback, useEffect, useRef } from "react";
import { Group, Label, Layer, Path, Tag, Text } from "react-konva";
import type Konva from "konva";
import { cursorStore } from "@/services/socket";
import type { TPresenceMember } from "@/services/socket/socket.types";

/** Custom cursor icon, authored in a 512x512 SVG viewBox. */
const CURSOR_ICON_PATH =
  "M 91 66 C 76 70, 66 82, 65 98 C 64 105, 66 114, 69 122 L 188 423 C 195 441, 208 448, 226 449 C 244 450, 260 440, 268 423 L 305 333 C 311 319, 319 309, 333 302 L 423 264 C 441 256, 450 245, 450 226 C 450 209, 441 195, 425 187 L 108 67 C 102 65, 96 64, 91 66 Z";
// The icon's own tip (its `M` start point) and a scale bringing its ~385-unit
// bounding box down to a normal on-screen cursor size.
const CURSOR_ICON_TIP = { x: 91, y: 66 };
const CURSOR_ICON_SCALE = 0.06;

export type TRemoteCursorsLayerProps = {
  /** One entry per remote socket — two tabs of one person are two cursors. */
  members: readonly TPresenceMember[];
  selfSocketId: string | null;
  /** This viewer's own active slide — only cursors on the same slide are shown. */
  canvasId: string;
  /** Inverse stage scale, so labels stay a constant size on screen. */
  inverseScale: number;
};

/**
 * Other people's pointers.
 *
 * Renders one group per remote socket — a React concern that changes only on
 * join/leave — and then moves those groups **imperatively** from the cursor
 * store. The result is zero React renders and zero Redux dispatches per cursor
 * frame: a moving cursor repaints this one non-listening canvas and nothing
 * else.
 */
function RemoteCursorsLayer({ members, selfSocketId, canvasId, inverseScale }: TRemoteCursorsLayerProps) {
  const layerRef = useRef<Konva.Layer | null>(null);
  const groupsRef = useRef<Map<string, Konva.Group>>(new Map());

  const registerGroup = useCallback((socketId: string, node: Konva.Group | null) => {
    if (node) {
      groupsRef.current.set(socketId, node);
      // Hidden until the first frame arrives, so a just-joined peer's cursor
      // doesn't sit at the origin.
      node.visible(cursorStore.get(socketId) !== null);
      return;
    }

    groupsRef.current.delete(socketId);
  }, []);

  useEffect(() => {
    let isFrameScheduled = false;

    // One frame of coalescing: N peers moving within the same frame produce a
    // single draw, not N.
    const scheduleDraw = (): void => {
      if (isFrameScheduled) {
        return;
      }

      isFrameScheduled = true;
      requestAnimationFrame(() => {
        isFrameScheduled = false;
        layerRef.current?.batchDraw();
      });
    };

    return cursorStore.subscribe((socketId, point) => {
      const group = groupsRef.current.get(socketId);

      if (!group) {
        return;
      }

      if (!point) {
        group.visible(false);
      } else {
        group.visible(true);
        group.position(point);
      }

      scheduleDraw();
    });
  }, []);

  return (
    <Layer ref={layerRef} listening={false}>
      {members
        .filter((member) => member.socketId !== selfSocketId && member.activeCanvasId === canvasId)
        .map((member) => (
          <Group
            key={member.socketId}
            ref={(node) => registerGroup(member.socketId, node)}
            scaleX={inverseScale}
            scaleY={inverseScale}
            visible={false}
          >
            <Path
              data={CURSOR_ICON_PATH}
              offsetX={CURSOR_ICON_TIP.x}
              offsetY={CURSOR_ICON_TIP.y}
              scaleX={CURSOR_ICON_SCALE}
              scaleY={CURSOR_ICON_SCALE}
              fill={member.color}
              stroke="#ffffff"
              strokeWidth={1}
              strokeScaleEnabled={false}
              perfectDrawEnabled={false}
            />
            <Label x={20} y={22}>
              <Tag fill={member.color} cornerRadius={3} />
              <Text
                text={member.username}
                fontSize={11}
                fontStyle="600"
                fill="#ffffff"
                padding={4}
                perfectDrawEnabled={false}
              />
            </Label>
          </Group>
        ))}
    </Layer>
  );
}

export default memo(RemoteCursorsLayer);
