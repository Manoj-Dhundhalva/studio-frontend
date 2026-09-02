import { memo, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Avatar, Button, Flex, Input, Select, Space, Spin, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "@/store";
import { addProjectMembers } from "@/store/slices/members.slice";
import { selectCurrentUser } from "@/store/slices/user.slice";
import { usersService } from "@/services/users";
import type { TSearchUser } from "@/services/users/users.types";
import {
  AssignableProjectMemberRoleSchema,
  type TAssignableProjectMemberRole,
} from "@/services/projects/projects.types";
import { utils } from "@/utils";
import styles from "./AddMemberForm.module.scss";

const ROLE_OPTIONS = AssignableProjectMemberRoleSchema.options.map((role) => ({ label: role, value: role }));
const SEARCH_DEBOUNCE_MS = 300;

export type TAddMemberFormProps = {
  projectId: string;
  existingMemberIds: string[];
  onDone: () => void;
};

function AddMemberForm({ projectId, existingMemberIds, onDone }: TAddMemberFormProps) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TSearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [accessibilityByUserId, setAccessibilityByUserId] = useState<Record<string, TAssignableProjectMemberRole>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    abortControllerRef.current?.abort();

    const trimmed = value.trim();

    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const users = await usersService.searchUsers(trimmed, { signal: controller.signal });
        setResults(
          users.filter((user) => user.userId !== currentUser?.userId && !existingMemberIds.includes(user.userId)),
        );
      } catch (error) {
        if (!axios.isCancel(error)) {
          utils.toast.error("Failed to search users.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleAdd = async (user: TSearchUser) => {
    const accessibility = accessibilityByUserId[user.userId] ?? "viewer";
    setAddingUserId(user.userId);
    try {
      await dispatch(addProjectMembers({ projectId, members: [{ userId: user.userId, accessibility }] })).unwrap();
      utils.toast.success(`${user.username} added.`);
      setResults((prev) => prev.filter((result) => result.userId !== user.userId));
      onDone();
    } catch (error) {
      utils.toast.error(error instanceof Error ? error.message : "Failed to add member.");
    } finally {
      setAddingUserId(null);
    }
  };

  return (
    <Flex vertical gap={8} className={styles["form"]} data-testid="add-member-form">
      <Input
        size="small"
        placeholder="Search by username or email"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        allowClear
        autoFocus
        data-testid="add-member-search"
      />

      {isSearching && (
        <Flex justify="center" className={styles["spinner"]}>
          <Spin size="small" />
        </Flex>
      )}

      {!isSearching && query.trim() && results.length === 0 && (
        <Typography.Text type="secondary">No users found.</Typography.Text>
      )}

      {results.map((user) => (
        <Flex key={user.userId} align="center" justify="space-between" gap={8}>
          <Flex align="center" gap={8} className={styles["identity"]}>
            <Avatar size={24} className={styles["avatar"] ?? ""} src={user.avatar} icon={<UserOutlined />} />
            <Flex vertical className={styles["names"]}>
              <Typography.Text ellipsis>{user.username}</Typography.Text>
              <Typography.Text type="secondary" ellipsis className={styles["email"] ?? ""}>
                {user.email}
              </Typography.Text>
            </Flex>
          </Flex>

          <Space>
            <Select<TAssignableProjectMemberRole>
              size="small"
              value={accessibilityByUserId[user.userId] ?? "viewer"}
              options={ROLE_OPTIONS}
              onChange={(value) => setAccessibilityByUserId((prev) => ({ ...prev, [user.userId]: value }))}
              className={styles["select"] ?? ""}
            />
            <Button size="small" type="primary" loading={addingUserId === user.userId} onClick={() => handleAdd(user)}>
              Add
            </Button>
          </Space>
        </Flex>
      ))}
    </Flex>
  );
}

export default memo(AddMemberForm);
