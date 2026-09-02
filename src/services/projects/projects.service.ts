import { api } from "@/services/api";
import {
  ProjectDetailSchema,
  ProjectMembersListSchema,
  ProjectNameUpdateSchema,
  ProjectSchema,
  ProjectsListSchema,
  type TMemberAccessibilityInput,
  type TProject,
  type TProjectDetail,
  type TProjectMembersList,
  type TProjectNameUpdate,
  type TUserProjectSummary,
} from "./projects.types";

/** Surfaces the backend's own `error` message (e.g. the 409 last-admin case) instead of axios's generic status-code message. */
const toServiceError = (error: unknown, fallback: string): Error => {
  const message = (error as { apiError?: { data?: { error?: string } } })?.apiError?.data?.error;
  return new Error(message ?? fallback);
};

class ProjectsService {
  private static instance: ProjectsService;

  private constructor() {}

  static getInstance(): ProjectsService {
    if (!ProjectsService.instance) {
      ProjectsService.instance = new ProjectsService();
    }
    return ProjectsService.instance;
  }

  createProject = async (): Promise<TProject> => {
    const { data } = await api.post("/projects");
    return ProjectSchema.parse(data);
  };

  getProjects = async (): Promise<TUserProjectSummary[]> => {
    const { data } = await api.get("/projects");
    return ProjectsListSchema.parse(data).projects;
  };

  getProject = async (projectId: string): Promise<TProjectDetail> => {
    const { data } = await api.get(`/projects/${projectId}`);
    return ProjectDetailSchema.parse(data);
  };

  updateProjectName = async (projectId: string, projectName: string): Promise<TProjectNameUpdate> => {
    const { data } = await api.patch(`/projects/${projectId}/name`, { projectName });
    return ProjectNameUpdateSchema.parse(data);
  };

  getProjectMembers = async (
    projectId: string,
    { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {},
  ): Promise<TProjectMembersList> => {
    const { data } = await api.get(`/projects/${projectId}/members`, { params: { limit, offset } });
    return ProjectMembersListSchema.parse(data);
  };

  addProjectMembers = async (projectId: string, members: TMemberAccessibilityInput[]): Promise<void> => {
    try {
      await api.post(`/projects/${projectId}/members`, { members });
    } catch (error) {
      throw toServiceError(error, "Failed to add member(s).");
    }
  };

  updateProjectMembersAccessibility = async (
    projectId: string,
    members: TMemberAccessibilityInput[],
  ): Promise<void> => {
    try {
      await api.patch(`/projects/${projectId}/members`, { members });
    } catch (error) {
      throw toServiceError(error, "Failed to update accessibility.");
    }
  };

  removeProjectMembers = async (projectId: string, userIds: string[]): Promise<void> => {
    try {
      await api.delete(`/projects/${projectId}/members`, { data: { userIds } });
    } catch (error) {
      throw toServiceError(error, "Failed to remove member(s).");
    }
  };
}

export const projectsService = ProjectsService.getInstance();
