import { memo } from "react";
import { useParams } from "react-router-dom";
import { Skeleton, Typography } from "antd";
import { useAppDispatch, useAppSelector } from "@/store";
import { REQUEST_STATUS, selectProject, selectProjectStatus, updateProjectName } from "@/store/slices/project.slice";
import { ProjectNameSchema } from "@/services/projects/projects.types";
import { utils } from "@/utils";
import styles from "./ProjectTitle.module.scss";

function ProjectTitle() {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();

  const project = useAppSelector((state) => (projectId ? selectProject(state, projectId) : null));
  const status = useAppSelector((state) => (projectId ? selectProjectStatus(state, projectId) : REQUEST_STATUS.IDLE));

  if (!projectId) {
    return null;
  }

  if (!project) {
    if (status !== REQUEST_STATUS.LOADING) {
      return null;
    }

    return (
      <Skeleton.Input active size="small" className={styles["skeleton"] ?? ""} data-testid="project-title-loading" />
    );
  }

  const isSaving = status === REQUEST_STATUS.LOADING;
  // Renaming is admin-only server-side (`updateProjectName`'s membership check) — hiding
  // the affordance for everyone else avoids an edit control that always 403s.
  const isCurrentUserAdmin = project.accessibility === "admin";

  const handleRename = async (nextName: string) => {
    const result = ProjectNameSchema.safeParse(nextName);
    if (!result.success) {
      utils.toast.error(result.error.issues[0]?.message ?? "Invalid project name");
      return;
    }

    const projectName = result.data;
    if (projectName === project.projectName) {
      return;
    }

    try {
      await dispatch(updateProjectName({ projectId, projectName })).unwrap();
    } catch {
      utils.toast.error("Failed to rename project. Please try again.");
    }
  };

  return (
    <Typography.Text
      className={styles["project-title"] ?? ""}
      aria-label="Project name"
      editable={
        isSaving || !isCurrentUserAdmin
          ? false
          : {
              triggerType: ["text", "icon"],
              onChange: handleRename,
            }
      }
      data-testid="project-name"
    >
      {project.projectName}
    </Typography.Text>
  );
}

export default memo(ProjectTitle);
