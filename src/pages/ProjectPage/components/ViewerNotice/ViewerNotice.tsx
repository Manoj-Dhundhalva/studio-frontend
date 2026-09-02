import { memo } from "react";
import { Alert } from "antd";

/**
 * Read-only banner. The server rejects a viewer's mutations regardless of what
 * the UI shows, so this exists to explain why the tools are disabled — not to
 * enforce anything.
 */
function ViewerNotice() {
  return (
    <Alert
      type="info"
      showIcon
      banner
      title="View only — you don't have permission to edit this design."
      data-testid="viewer-notice"
    />
  );
}

export default memo(ViewerNotice);
