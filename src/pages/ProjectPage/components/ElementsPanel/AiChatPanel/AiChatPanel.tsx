import { useEffect, useRef, useState } from "react";
import { Button, Flex, Input, Typography } from "antd";
import { SendOutlined } from "@ant-design/icons";
import type { TAiMessage } from "@/services/ai/ai.types";
import styles from "./AiChatPanel.module.scss";

export type TAiChatPanelProps = {
  canEdit: boolean;
  messages: readonly TAiMessage[];
  isLoading: boolean;
  isSending: boolean;
  onSend: (content: string) => void;
};

function AiChatPanel({ canEdit, messages, isLoading, isSending, onSend }: TAiChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSend = () => {
    if (!draft.trim() || isSending) {
      return;
    }

    onSend(draft);
    setDraft("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Flex vertical className={styles["chat"] ?? ""} data-testid="ai-chat-panel">
      <div className={styles["messages"] ?? ""} ref={listRef} data-testid="ai-chat-messages">
        {!isLoading && messages.length === 0 && (
          <Typography.Text type="secondary" className={styles["empty"] ?? ""}>
            Ask AI to design this slide, or build a whole deck — try &ldquo;make a 10-slide pitch deck for a chat
            app&rdquo;.
          </Typography.Text>
        )}

        {messages.map((message) => (
          <div
            key={message.messageId}
            className={`${styles["bubble-row"] ?? ""} ${
              message.role === "user" ? (styles["bubble-row-user"] ?? "") : ""
            }`}
          >
            <div
              className={`${styles["bubble"] ?? ""} ${
                message.role === "user" ? (styles["bubble-user"] ?? "") : (styles["bubble-assistant"] ?? "")
              }`}
            >
              <Typography.Paragraph className={styles["bubble-text"] ?? ""}>{message.content}</Typography.Paragraph>
              {message.opsSummary && (
                <Typography.Text type="secondary" className={styles["ops-summary"] ?? ""}>
                  ✓ {message.opsSummary}
                </Typography.Text>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className={styles["bubble-row"] ?? ""} data-testid="ai-thinking">
            <div className={`${styles["bubble"] ?? ""} ${styles["bubble-assistant"] ?? ""}`}>
              <span className={styles["typing"] ?? ""}>
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}
      </div>

      <Flex gap={6} className={styles["composer"] ?? ""}>
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 6 }}
          placeholder={canEdit ? "Ask AI to change this slide…" : "Viewers cannot use the AI assistant"}
          value={draft}
          disabled={!canEdit || isSending}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          data-testid="ai-chat-input"
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          disabled={!canEdit || isSending || draft.trim().length === 0}
          onClick={handleSend}
          data-testid="ai-chat-send"
        />
      </Flex>
    </Flex>
  );
}

export default AiChatPanel;
