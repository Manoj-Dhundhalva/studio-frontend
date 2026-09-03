import { z } from "zod";

export const AiMessageSchema = z.object({
  messageId: z.string(),
  projectId: z.string(),
  /** Null once the slide the turn was sent against has been deleted. */
  canvasId: z.string().nullable(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  opsSummary: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export type TAiMessage = z.infer<typeof AiMessageSchema>;

export const AiMessageListSchema = z.object({
  messages: z.array(AiMessageSchema),
});

export const SendAiMessageResponseSchema = z.object({
  userMessage: AiMessageSchema,
  assistantMessage: AiMessageSchema,
  /** Slides the request created, in order — lets the editor jump to the first. */
  createdCanvasIds: z.array(z.string()).default([]),
  /** Slides the request deleted. */
  deletedCanvasIds: z.array(z.string()).default([]),
});
