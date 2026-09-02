import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Flex, Skeleton, Tag, Typography } from "antd";
import { FileImageOutlined, PlusOutlined } from "@ant-design/icons";
import { projectsService } from "@/services/projects";
import { utils } from "@/utils";
import styles from "./HomePage.module.scss";

const SKELETON_CARD_COUNT = 6;

function HomePage() {
  const navigate = useNavigate();

  const { mutate: createProject, isPending: isCreating } = useMutation({
    mutationFn: projectsService.createProject,
    onSuccess: ({ projectId }) => {
      navigate(`/project/${projectId}`);
    },
    onError: (error) => {
      console.error("Failed to create project", error);
      utils.toast.error("Failed to create project. Please try again.");
    },
  });

  const {
    data: projects,
    isLoading: isLoadingProjects,
    isError: isProjectsError,
    refetch: refetchProjects,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsService.getProjects,
  });

  return (
    <Flex vertical gap={20} className={styles["page"] ?? ""} data-testid="home-page">
      <Flex align="center" justify="space-between">
        <Typography.Title level={3} className={styles["title"] ?? ""}>
          Your projects
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={isCreating}
          onClick={() => createProject()}
          data-testid="create-project"
        >
          Create new project
        </Button>
      </Flex>

      {isLoadingProjects && (
        <div className={styles["grid"] ?? ""} data-testid="projects-loading">
          {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
            <div key={index} className={styles["card"] ?? ""}>
              <Skeleton active title={{ width: "70%" }} paragraph={{ rows: 1, width: "40%" }} />
            </div>
          ))}
        </div>
      )}

      {isProjectsError && (
        <Flex vertical align="center" gap={8} className={styles["state"] ?? ""} data-testid="projects-error">
          <Typography.Text type="danger">Failed to load your projects.</Typography.Text>
          <Button type="link" onClick={() => void refetchProjects()}>
            Retry
          </Button>
        </Flex>
      )}

      {!isLoadingProjects && !isProjectsError && projects && projects.length === 0 && (
        <Flex vertical align="center" gap={8} className={styles["state"] ?? ""} data-testid="projects-empty">
          <FileImageOutlined className={styles["empty-icon"] ?? ""} />
          <Typography.Text type="secondary">You don't have any projects yet.</Typography.Text>
          <Button type="primary" icon={<PlusOutlined />} loading={isCreating} onClick={() => createProject()}>
            Create your first project
          </Button>
        </Flex>
      )}

      {!isLoadingProjects && !isProjectsError && projects && projects.length > 0 && (
        <div className={styles["grid"] ?? ""} data-testid="projects-list">
          {projects.map((project) => (
            <div
              key={project.projectId}
              className={styles["card"] ?? ""}
              onClick={() => navigate(`/project/${project.projectId}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  navigate(`/project/${project.projectId}`);
                }
              }}
              data-testid="project-item"
            >
              <div className={styles["card-thumb"] ?? ""}>
                <FileImageOutlined />
              </div>
              <Flex vertical gap={4} className={styles["card-body"] ?? ""}>
                <Typography.Text strong ellipsis className={styles["card-name"] ?? ""}>
                  {project.projectName}
                </Typography.Text>
                <Flex align="center" gap={8}>
                  <Tag className={styles["card-tag"] ?? ""}>{project.accessibility}</Tag>
                  <Typography.Text type="secondary" className={styles["card-date"] ?? ""}>
                    Updated {project.updatedAt.toLocaleDateString()}
                  </Typography.Text>
                </Flex>
              </Flex>
            </div>
          ))}
        </div>
      )}
    </Flex>
  );
}

export default memo(HomePage);
