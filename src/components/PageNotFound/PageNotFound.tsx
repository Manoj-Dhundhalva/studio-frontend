import { memo } from "react";
import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";
import styles from "./PageNotFound.module.scss";

/**
 * react-router stamps an `idx` onto history state. `idx > 0` means there is an
 * in-app entry to go back to; without the check, "Go Back" on a deep link
 * navigates the user straight out of the app.
 */
function hasInAppHistory(): boolean {
  const idx: unknown = window.history.state?.idx;
  return typeof idx === "number" && idx > 0;
}

function PageNotFound() {
  const navigate = useNavigate();
  const canGoBack = hasInAppHistory();

  return (
    <div className={styles["page-not-found"]}>
      <Result
        status="404"
        title="404"
        subTitle="Sorry, the page you visited does not exist."
        extra={[
          <Button type="primary" key="home" onClick={() => navigate("/")}>
            Back Home
          </Button>,
          ...(canGoBack
            ? [
                <Button key="back" onClick={() => navigate(-1)}>
                  Go Back
                </Button>,
              ]
            : []),
        ]}
      />
    </div>
  );
}

export default memo(PageNotFound);
