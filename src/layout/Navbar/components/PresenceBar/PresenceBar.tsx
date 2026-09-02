import { memo } from "react";
import { useParams } from "react-router-dom";
import { Avatar, Tooltip } from "antd";
import { useAppSelector } from "@/store";
import { selectPresenceMembers } from "@/store/slices/presence.slice";
import { selectCurrentUser } from "@/store/slices/user.slice";
import styles from "./PresenceBar.module.scss";

/** Initial used when someone has no avatar image. */
const initialOf = (username: string): string => username.trim().charAt(0).toUpperCase() || "?";

/**
 * Who is in the editor right now.
 *
 * Lives in the navbar, which renders in `EditorLayout` — an ancestor of the
 * project route — so it reads presence from the store rather than from the page.
 * Deduplicated to one avatar per person, so someone with three tabs open shows
 * once here (while still having three cursors on the canvas).
 */
function PresenceBar() {
  const { projectId } = useParams<{ projectId: string }>();
  const currentUser = useAppSelector(selectCurrentUser);
  const members = useAppSelector((state) => (projectId ? selectPresenceMembers(state, projectId) : null));

  // Inert outside a project, so the navbar can be reused elsewhere unchanged.
  if (!projectId || !members || members.length === 0) {
    return null;
  }

  return (
    <Avatar.Group max={{ count: 5 }} size="small" className={styles["presence"] ?? ""} data-testid="presence-bar">
      {members.map((member) => {
        const isSelf = member.userId === currentUser?.userId;

        return (
          <Tooltip key={member.userId} title={isSelf ? `${member.username} (you)` : member.username}>
            <Avatar
              size="small"
              src={member.avatarUrl}
              // The ring is the person's assigned cursor colour, so an avatar
              // here and a pointer on the canvas are visibly the same person.
              style={{ boxShadow: `0 0 0 2px ${member.color}` }}
              data-testid={`presence-avatar-${member.userId}`}
            >
              {initialOf(member.username)}
            </Avatar>
          </Tooltip>
        );
      })}
    </Avatar.Group>
  );
}

export default memo(PresenceBar);
