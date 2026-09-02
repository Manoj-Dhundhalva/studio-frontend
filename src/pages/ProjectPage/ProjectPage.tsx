import { memo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Skeleton, Typography } from "antd";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  REQUEST_STATUS,
  fetchProject,
  selectProject,
  selectProjectError,
  selectProjectStatus,
} from "@/store/slices/project.slice";
import styles from "./ProjectPage.module.scss";

function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();

  const project = useAppSelector((state) => (projectId ? selectProject(state, projectId) : null));
  const status = useAppSelector((state) => (projectId ? selectProjectStatus(state, projectId) : REQUEST_STATUS.IDLE));
  const error = useAppSelector((state) => (projectId ? selectProjectError(state, projectId) : null));

  const isInitialLoading = status === REQUEST_STATUS.LOADING && !project;

  useEffect(() => {
    if (projectId && status === REQUEST_STATUS.IDLE) {
      void dispatch(fetchProject(projectId));
    }
  }, [projectId, status, dispatch]);

  if (!projectId) {
    return null;
  }

  if (isInitialLoading) {
    return <Skeleton active className={styles["project-page"] ?? ""} data-testid="project-loading" />;
  }

  if (status === REQUEST_STATUS.FAILED && !project) {
    return (
      <Typography.Text type="danger" data-testid="project-error">
        {error ?? "Failed to load project."}
      </Typography.Text>
    );
  }

  return <div className={styles["project-page"]} data-testid="project-page" />;
}

export default memo(ProjectPage);
