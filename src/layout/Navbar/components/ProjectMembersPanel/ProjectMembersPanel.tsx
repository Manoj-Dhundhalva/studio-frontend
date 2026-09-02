import { memo, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Divider, Flex, Popover, Skeleton, Tooltip, Typography } from "antd";
import { PlusOutlined, TeamOutlined, UsergroupAddOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "@/store";
import { selectCurrentUser } from "@/store/slices/user.slice";
import { fetchProject, selectProject, selectProjectStatus } from "@/store/slices/project.slice";
import {
  REQUEST_STATUS,
  fetchProjectMembers,
  loadMoreProjectMembers,
  selectProjectMembers,
  selectProjectMembersError,
  selectProjectMembersStatus,
  selectProjectMembersTotal,
} from "@/store/slices/members.slice";
import MemberRow from "./components/MemberRow";
import AddMemberForm from "./components/AddMemberForm";
import styles from "./ProjectMembersPanel.module.scss";

function ProjectMembersPanel() {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const project = useAppSelector((state) => (projectId ? selectProject(state, projectId) : null));
  const projectStatus = useAppSelector((state) =>
    projectId ? selectProjectStatus(state, projectId) : REQUEST_STATUS.IDLE,
  );
  const members = useAppSelector((state) => (projectId ? selectProjectMembers(state, projectId) : null));
  const total = useAppSelector((state) => (projectId ? selectProjectMembersTotal(state, projectId) : 0));
  const status = useAppSelector((state) =>
    projectId ? selectProjectMembersStatus(state, projectId) : REQUEST_STATUS.IDLE,
  );
  const error = useAppSelector((state) => (projectId ? selectProjectMembersError(state, projectId) : null));
  const [isAddingMember, setIsAddingMember] = useState(false);

  const isInitialLoading = status === REQUEST_STATUS.LOADING && !members;
  /**
   * Sourced from the project detail's own `accessibility` (the requester's
   * role on this project) rather than scanning the — possibly paginated —
   * members list, so admin-only controls stay correct even when the viewer's
   * own row hasn't been paged into `members` yet.
   */
  const isCurrentUserAdmin = project?.accessibility === "admin";

  /** Pins the viewer's own row to the top so it's never lost below the fold or a "Load more". */
  const sortedMembers = useMemo(() => {
    if (!members || !currentUser) {
      return members;
    }
    const selfIndex = members.findIndex((member) => member.userId === currentUser.userId);
    if (selfIndex <= 0) {
      return members;
    }
    const self = members[selfIndex]!;
    return [self, ...members.slice(0, selfIndex), ...members.slice(selfIndex + 1)];
  }, [members, currentUser]);

  useEffect(() => {
    if (projectId && projectStatus === REQUEST_STATUS.IDLE) {
      void dispatch(fetchProject(projectId));
    }
  }, [projectId, projectStatus, dispatch]);

  if (!projectId) {
    return null;
  }

  const handleFetchMembers = () => {
    void dispatch(fetchProjectMembers(projectId));
  };

  const handleOpenChange = (open: boolean) => {
    if (open && (status === REQUEST_STATUS.IDLE || status === REQUEST_STATUS.FAILED)) {
      handleFetchMembers();
    }
    if (!open) {
      setIsAddingMember(false);
    }
  };

  const handleLoadMore = () => {
    void dispatch(loadMoreProjectMembers(projectId));
  };

  const content = (
    <div className={styles["panel"]} data-testid="project-members-panel">
      <Flex align="center" justify="space-between" className={styles["header"]}>
        <Typography.Text strong>Members{total ? ` (${total})` : ""}</Typography.Text>
        {isCurrentUserAdmin && (
          <Button
            size="small"
            type="text"
            icon={<PlusOutlined />}
            onClick={() => setIsAddingMember((prev) => !prev)}
            aria-label="Add member"
            data-testid="toggle-add-member"
          />
        )}
      </Flex>

      <Divider className={styles["divider"] ?? ""} />

      {isAddingMember && (
        <AddMemberForm
          projectId={projectId}
          existingMemberIds={members?.map((member) => member.userId) ?? []}
          onDone={() => setIsAddingMember(false)}
        />
      )}

      {isInitialLoading && <Skeleton active paragraph={{ rows: 3 }} title={false} />}

      {status === REQUEST_STATUS.FAILED && !members && (
        <Flex vertical gap={4} align="flex-start">
          <Typography.Text type="danger">{error ?? "Failed to load members."}</Typography.Text>
          <Button size="small" type="link" onClick={handleFetchMembers}>
            Retry
          </Button>
        </Flex>
      )}

      {sortedMembers && (
        <Flex vertical className={styles["list"]}>
          {sortedMembers.map((member) => (
            <MemberRow
              key={member.userId}
              projectId={projectId}
              member={member}
              isCurrentUserAdmin={isCurrentUserAdmin}
              isSelf={member.userId === currentUser?.userId}
            />
          ))}
        </Flex>
      )}

      {members && members.length < total && (
        <Flex justify="center">
          <Button type="link" size="small" loading={status === REQUEST_STATUS.LOADING} onClick={handleLoadMore}>
            Load more
          </Button>
        </Flex>
      )}
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight" onOpenChange={handleOpenChange}>
      <Tooltip title={isCurrentUserAdmin ? "Add Contributors" : "Members"}>
        <Button
          color="default"
          shape="circle"
          variant="filled"
          icon={isCurrentUserAdmin ? <UsergroupAddOutlined /> : <TeamOutlined />}
          data-testid="project-members-trigger"
        />
      </Tooltip>
    </Popover>
  );
}

export default memo(ProjectMembersPanel);
