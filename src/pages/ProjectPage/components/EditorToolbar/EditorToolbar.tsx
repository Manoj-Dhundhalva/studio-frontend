import { memo } from "react";
import { Button, Flex, Tooltip, Typography } from "antd";
import { CompressOutlined, MinusOutlined, PlusOutlined } from "@ant-design/icons";
import styles from "./EditorToolbar.module.scss";

export type TEditorToolbarProps = {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
};

/** Floating zoom controls, pinned to the bottom of the stage area. */
function EditorToolbar({ scale, onZoomIn, onZoomOut, onFit }: TEditorToolbarProps) {
  return (
    <Flex align="center" gap={4} className={styles["toolbar"] ?? ""} data-testid="editor-toolbar">
      <Tooltip title="Zoom out">
        <Button size="small" type="text" icon={<MinusOutlined />} onClick={onZoomOut} aria-label="Zoom out" />
      </Tooltip>
      <Typography.Text className={styles["zoom-label"] ?? ""} data-testid="zoom-level">
        {Math.round(scale * 100)}%
      </Typography.Text>
      <Tooltip title="Zoom in">
        <Button size="small" type="text" icon={<PlusOutlined />} onClick={onZoomIn} aria-label="Zoom in" />
      </Tooltip>
      <Tooltip title="Fit to screen">
        <Button size="small" type="text" icon={<CompressOutlined />} onClick={onFit} aria-label="Fit to screen" />
      </Tooltip>
    </Flex>
  );
}

export default memo(EditorToolbar);
