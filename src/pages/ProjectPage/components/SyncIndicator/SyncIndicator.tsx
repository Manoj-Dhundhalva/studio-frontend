import { memo } from "react";
import { Flex, Typography } from "antd";
import { CheckCircleOutlined, CloudSyncOutlined, DisconnectOutlined } from "@ant-design/icons";
import { SYNC_STATUS, type TSyncStatus } from "@/services/canvas/canvas.constants";
import styles from "./SyncIndicator.module.scss";

export type TSyncIndicatorProps = {
  status: TSyncStatus;
  pendingCount: number;
};

/**
 * Autosave feedback. There is no save button — edits are persisted by the
 * server's flush loop — so this is the only signal that work is safe.
 */
function SyncIndicator({ status, pendingCount }: TSyncIndicatorProps) {
  if (status === SYNC_STATUS.RECONNECTING || status === SYNC_STATUS.OFFLINE) {
    return (
      <Flex align="center" gap={6} className={styles["indicator"] ?? ""} data-testid="sync-indicator">
        <DisconnectOutlined className={styles["icon-warning"] ?? ""} />
        <Typography.Text type="warning">Reconnecting…</Typography.Text>
      </Flex>
    );
  }

  if (pendingCount > 0) {
    return (
      <Flex align="center" gap={6} className={styles["indicator"] ?? ""} data-testid="sync-indicator">
        <CloudSyncOutlined />
        <Typography.Text type="secondary">Saving…</Typography.Text>
      </Flex>
    );
  }

  return (
    <Flex align="center" gap={6} className={styles["indicator"] ?? ""} data-testid="sync-indicator">
      <CheckCircleOutlined className={styles["icon-ok"] ?? ""} />
      <Typography.Text type="secondary">All changes saved</Typography.Text>
    </Flex>
  );
}

export default memo(SyncIndicator);
