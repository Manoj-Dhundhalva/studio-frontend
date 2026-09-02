import { api } from "@/services/api";
import { AiMessageListSchema, SendAiMessageResponseSchema, type TAiMessage } from "./ai.types";

const toServiceError = (error: unknown, fallback: string): Error => {
  const message = (error as { apiError?: { data?: { error?: string } } })?.apiError?.data?.error;
  return new Error(message ?? fallback);
};

/** Matches the backend's own OpenAI request timeout — longer than the API client's default. */
const AI_REQUEST_TIMEOUT_MS = 70 * 1000;

class AiService {
  private static instance: AiService;

  private constructor() {}

  static getInstance(): AiService {
    if (!AiService.instance) {
      AiService.instance = new AiService();
    }
    return AiService.instance;
  }

  listMessages = async (projectId: string): Promise<TAiMessage[]> => {
    const { data } = await api.get(`/projects/${projectId}/ai/messages`);
    return AiMessageListSchema.parse(data).messages;
  };

  sendMessage = async (
    projectId: string,
    canvasId: string,
    content: string,
  ): Promise<{ userMessage: TAiMessage; assistantMessage: TAiMessage }> => {
    try {
      const { data } = await api.post(
        `/projects/${projectId}/ai/messages`,
        { canvasId, content },
        { timeout: AI_REQUEST_TIMEOUT_MS },
      );
      return SendAiMessageResponseSchema.parse(data);
    } catch (error) {
      throw toServiceError(error, "Failed to send message to the AI assistant");
    }
  };
}

export const aiService = AiService.getInstance();
