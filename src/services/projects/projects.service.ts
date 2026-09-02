import { api } from "@/services/api";
import {
  ProjectDetailSchema,
  ProjectNameUpdateSchema,
  ProjectSchema,
  ProjectsListSchema,
  type TProject,
  type TProjectDetail,
  type TProjectNameUpdate,
  type TUserProjectSummary,
} from "./projects.types";

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
}

export const projectsService = ProjectsService.getInstance();
