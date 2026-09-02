import { memo } from "react";
import { Button, Typography } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { env } from "@/config/env";
import styles from "./LoginPage.module.scss";

/**
 * Full page navigation, not an API call — the backend needs the browser to
 * follow redirects through Google's consent screen before it can send the
 * user back to `/auth/callback` with a token.
 */
function handleContinueWithGoogle() {
  window.location.href = `${env.VITE_API_BASE_URL}/auth/google`;
}

function LoginPage() {
  return (
    <div className={styles["login-page"]}>
      <div className={styles["card"]}>
        <Typography.Title level={3}>Welcome</Typography.Title>
        <Typography.Paragraph type="secondary">Sign in to continue to Canva.</Typography.Paragraph>

        <Button
          block
          size="large"
          icon={<GoogleOutlined />}
          onClick={handleContinueWithGoogle}
          data-testid="continue-with-google"
        >
          Continue with Google
        </Button>
      </div>
    </div>
  );
}

export default memo(LoginPage);
