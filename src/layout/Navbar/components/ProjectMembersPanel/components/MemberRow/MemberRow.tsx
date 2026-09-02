import { memo, useState } from "react";
import { Avatar, Button, Flex, Popconfirm, Select, Space, Tag, Typography } from "antd";
import { DeleteOutlined, EditOutlined, UserOutlined } from "@ant-design/icons";
import { useAppDispatch } from "@/store";
import { removeProjectMembers, updateProjectMembersAccessibility } from "@/store/slices/members.slice";
import {
  AssignableProjectMemberRoleSchema,
  type TProjectMember,
  type TProjectMemberRole,
} from "@/services/projects/projects.types";
import { utils } from "@/utils";
import styles from "./MemberRow.module.scss";

const ROLE_OPTIONS = AssignableProjectMemberRoleSchema.options.map((role) => ({ label: role, value: role }));

export type TMemberRowProps = {
  projectId: string;
  member: TProjectMember;
  isCurrentUserAdmin: boolean;
  isSelf: boolean;
};

function MemberRow({ projectId, member, isCurrentUserAdmin, isSelf }: TMemberRowProps) {
  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [pendingAccessibility, setPendingAccessibility] = useState<TProjectMemberRole>(member.accessibility);

  const handleEdit = () => {
    setPendingAccessibility(member.accessibility);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      await dispatch(
        updateProjectMembersAccessibility({
          projectId,
          members: [{ userId: member.userId, accessibility: pendingAccessibility }],
        }),
      ).unwrap();
      utils.toast.success("Accessibility updated.");
      setIsEditing(false);
    } catch (error) {
      utils.toast.error(error instanceof Error ? error.message : "Failed to update accessibility.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await dispatch(removeProjectMembers({ projectId, userIds: [member.userId] })).unwrap();
      utils.toast.success("Member removed.");
    } catch (error) {
      utils.toast.error(error instanceof Error ? error.message : "Failed to remove member.");
      setIsRemoving(false);
    }
  };

  return (
    <Flex align="center" justify="space-between" gap={12} className={styles["row"]} data-testid="member-row">
      <Flex align="center" gap={8} className={styles["identity"]}>
        <Avatar size={32} className={styles["avatar"] ?? ""} src={member.avatar} icon={<UserOutlined />} />
        <Flex vertical className={styles["names"]}>
          <Typography.Text ellipsis>
            {member.username}
            {isSelf && <Typography.Text type="secondary"> (you)</Typography.Text>}
          </Typography.Text>
          <Typography.Text type="secondary" ellipsis className={styles["email"] ?? ""}>
            {member.email}
          </Typography.Text>
        </Flex>
      </Flex>

      {isEditing ? (
        <Space>
          <Select<TProjectMemberRole>
            size="small"
            value={pendingAccessibility}
            options={ROLE_OPTIONS}
            onChange={setPendingAccessibility}
            className={styles["select"] ?? ""}
          />
          <Button
            size="small"
            type="primary"
            loading={isSaving}
            disabled={pendingAccessibility === member.accessibility}
            onClick={handleUpdate}
          >
            Update
          </Button>
          <Button size="small" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
        </Space>
      ) : (
        <Space>
          <Tag>{member.accessibility}</Tag>
          {isCurrentUserAdmin && member.accessibility !== "admin" && (
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={handleEdit}
              aria-label="Edit accessibility"
            />
          )}
          {isCurrentUserAdmin && !isSelf && (
            <Popconfirm
              title="Remove this member?"
              onConfirm={handleRemove}
              okText="Remove"
              cancelText="Cancel"
              okButtonProps={{ loading: isRemoving }}
            >
              <Button
                size="small"
                type="text"
                danger
                loading={isRemoving}
                icon={<DeleteOutlined />}
                aria-label="Remove member"
              />
            </Popconfirm>
          )}
        </Space>
      )}
    </Flex>
  );
}

export default memo(MemberRow);
