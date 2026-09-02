import { useCallback, useEffect } from "react";
import { aiService } from "@/services/ai/ai.service";
import type { TAiMessage } from "@/services/ai/ai.types";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  aiMessageAdded,
  aiSendFinished,
  aiSendStarted,
  fetchAiMessages,
  REQUEST_STATUS,
  selectAiMessages,
  selectAiStatus,
  selectIsAiSending,
} from "@/store/slices/ai.slice";
import { utils } from "@/utils";

type TUseAiAssistantResult = {
  messages: readonly TAiMessage[];
  isLoading: boolean;
  isSending: boolean;
  sendMessage: (content: string) => void;
};

/**
 * The AI panel's chat history: fetched once per project (like `useMediaLibrary`),
 * then kept live by the `ai:messageCreated` broadcast `useCanvasRoom` already
 * applies. `sendMessage` is fire-and-forget from the caller's perspective — the
 * REST response and the broadcast both land through the same idempotent
 * `aiMessageAdded` reducer, so whichever arrives first wins with no duplicate.
 */
export const useAiAssistant = (projectId: string, canvasId: string): TUseAiAssistantResult => {
  const dispatch = useAppDispatch();
  const messages = useAppSelector((state) => selectAiMessages(state, projectId));
  const status = useAppSelector((state) => selectAiStatus(state, projectId));
  const isSending = useAppSelector((state) => selectIsAiSending(state, projectId));

  useEffect(() => {
    if (status === REQUEST_STATUS.IDLE) {
      void dispatch(fetchAiMessages(projectId));
    }
  }, [dispatch, projectId, status]);

  const sendMessage = useCallback(
    (content: string): void => {
      const trimmed = content.trim();

      if (!trimmed) {
        return;
      }

      dispatch(aiSendStarted(projectId));

      void aiService
        .sendMessage(projectId, canvasId, trimmed)
        .then(({ userMessage, assistantMessage }) => {
          dispatch(aiMessageAdded({ projectId, message: userMessage }));
          dispatch(aiMessageAdded({ projectId, message: assistantMessage }));
        })
        .catch((error: unknown) => {
          utils.toast.error(error instanceof Error ? error.message : "Failed to send message to the AI assistant");
        })
        .finally(() => {
          dispatch(aiSendFinished(projectId));
        });
    },
    [dispatch, projectId, canvasId],
  );

  return { messages, isLoading: status === REQUEST_STATUS.LOADING, isSending, sendMessage };
};
