import { memo } from "react";
import { Tag } from "antd";
import { EyeOutlined } from "@ant-design/icons";

/**
 * The server rejects a viewer's mutations regardless of what the UI shows,
 * so this exists to explain why the tools are disabled — not to enforce anything.
 */
function ViewerNotice() {
  return (
    <Tag icon={<EyeOutlined />} data-testid="viewer-notice">
      View only
    </Tag>
  );
}

export default memo(ViewerNotice);
