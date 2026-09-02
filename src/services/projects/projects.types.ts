import { z } from "zod";

/** Declared first: the schemas below reference it at module-evaluation time. */
export const ProjectMemberRoleSchema = z.enum(["admin", "editor", "viewer"]);

export type TProjectMemberRole = z.infer<typeof ProjectMemberRoleSchema>;

export const PROJECT_ROLE = {
  ADMIN: "admin",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

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
  // The requester's own role on this project. Typed as the enum rather than a
  // bare string so `canEdit` and the live `access:changed` patch line up.
  accessibility: ProjectMemberRoleSchema,
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

export const ProjectMemberSchema = z.object({
  userId: z.string(),
  avatar: z.url().nullable(),
  username: z.string(),
  email: z.email(),
  accessibility: ProjectMemberRoleSchema,
});

export type TProjectMember = z.infer<typeof ProjectMemberSchema>;

export const ProjectMembersListSchema = z.object({
  members: z.array(ProjectMemberSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type TProjectMembersList = z.infer<typeof ProjectMembersListSchema>;

export type TMemberAccessibilityInput = {
  userId: string;
  accessibility: TProjectMemberRole;
};

/** "admin" is granted implicitly (project creation) or transferred outside this UI, never picked from a list. */
export const AssignableProjectMemberRoleSchema = ProjectMemberRoleSchema.exclude(["admin"]);

export type TAssignableProjectMemberRole = z.infer<typeof AssignableProjectMemberRoleSchema>;
