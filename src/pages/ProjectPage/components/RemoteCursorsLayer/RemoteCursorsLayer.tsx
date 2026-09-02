import { memo, useCallback, useEffect, useRef } from "react";
import { Group, Label, Layer, Line, Tag, Text } from "react-konva";
import type Konva from "konva";
import { cursorStore } from "@/services/socket";
import type { TPresenceMember } from "@/services/socket/socket.types";

export type TRemoteCursorsLayerProps = {
  /** One entry per remote socket — two tabs of one person are two cursors. */
  members: readonly TPresenceMember[];
  selfSocketId: string | null;
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
function RemoteCursorsLayer({ members, selfSocketId, inverseScale }: TRemoteCursorsLayerProps) {
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
        .filter((member) => member.socketId !== selfSocketId)
        .map((member) => (
          <Group
            key={member.socketId}
            ref={(node) => registerGroup(member.socketId, node)}
            scaleX={inverseScale}
            scaleY={inverseScale}
            visible={false}
          >
            {/* A simple arrow head, drawn in screen-constant units. */}
            <Line
              points={[0, 0, 0, 18, 5, 13, 11, 20, 14, 17, 8, 11, 14, 10]}
              closed
              fill={member.color}
              stroke="#ffffff"
              strokeWidth={1}
              perfectDrawEnabled={false}
            />
            <Label x={14} y={18}>
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
