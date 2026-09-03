import { api } from "@/services/api";
import { AiMessageListSchema, SendAiMessageResponseSchema, type TAiMessage } from "./ai.types";

const toServiceError = (error: unknown, fallback: string): Error => {
  const message = (error as { apiError?: { data?: { error?: string } } })?.apiError?.data?.error;
  return new Error(message ?? fallback);
};

/**
 * Comfortably above the backend's own 120s OpenAI timeout — generating a whole
 * deck is a long request, and aborting client-side first would leave the server
 * still writing slides the user never sees a reply for.
 */
const AI_REQUEST_TIMEOUT_MS = 130 * 1000;

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
  ): Promise<{ userMessage: TAiMessage; assistantMessage: TAiMessage; createdCanvasIds: string[] }> => {
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
