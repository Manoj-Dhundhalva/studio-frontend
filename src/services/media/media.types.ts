import { z } from "zod";

export const ProjectMediaSchema = z.object({
  mediaId: z.string(),
  projectId: z.string(),
  url: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  bytes: z.number(),
  uploadedBy: z.string().nullable(),
});

export type TProjectMedia = z.infer<typeof ProjectMediaSchema>;

export const ProjectMediaListSchema = z.object({
  media: z.array(ProjectMediaSchema),
});

export const ProjectMediaUploadResponseSchema = z.object({
  media: ProjectMediaSchema,
});
