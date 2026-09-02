import { z } from "zod";

export const ProjectSchema = z.object({
  projectId: z.string(),
});

export type TProject = z.infer<typeof ProjectSchema>;

export const UserProjectSummarySchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  accessibility: z.string(),
  updatedAt: z.coerce.date(),
});

export type TUserProjectSummary = z.infer<typeof UserProjectSummarySchema>;

export const ProjectsListSchema = z.object({
  projects: z.array(UserProjectSummarySchema),
});

export const ProjectDetailSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  accessibility: z.string(),
});

export type TProjectDetail = z.infer<typeof ProjectDetailSchema>;

export const ProjectNameUpdateSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
});

export type TProjectNameUpdate = z.infer<typeof ProjectNameUpdateSchema>;

export const ProjectNameSchema = z
  .string()
  .trim()
  .min(1, "Project name is required")
  .max(100, "Project name must be at most 100 characters");
