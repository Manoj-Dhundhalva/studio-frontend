import { z } from "zod";

export const AiMessageSchema = z.object({
  messageId: z.string(),
  projectId: z.string(),
  canvasId: z.string(),
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
});
