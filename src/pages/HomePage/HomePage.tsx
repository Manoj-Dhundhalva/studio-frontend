import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, List, Skeleton, Typography } from "antd";
import { projectsService } from "@/services/projects";
import { utils } from "@/utils";

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
  } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsService.getProjects,
  });

  return (
    <div>
      <h1>Homepage</h1>
      <Button type="primary" loading={isCreating} onClick={() => createProject()} data-testid="create-project">
        Create new project
      </Button>

      <Typography.Title level={4}>Your projects</Typography.Title>

      {isLoadingProjects && <Skeleton active data-testid="projects-loading" />}

      {isProjectsError && (
        <Typography.Text type="danger" data-testid="projects-error">
          Failed to load projects.
        </Typography.Text>
      )}

      {!isLoadingProjects && !isProjectsError && (
        <List
          dataSource={projects ?? []}
          locale={{ emptyText: "No projects yet." }}
          data-testid="projects-list"
          renderItem={(project) => (
            <List.Item
              key={project.projectId}
              onClick={() => navigate(`/project/${project.projectId}`)}
              style={{ cursor: "pointer" }}
              data-testid="project-item"
            >
              <List.Item.Meta
                title={project.projectName}
                description={`${project.accessibility} · Updated ${project.updatedAt.toLocaleDateString()}`}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
}

export default memo(HomePage);
