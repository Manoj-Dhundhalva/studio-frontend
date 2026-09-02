import { memo } from "react";
import { useLocation } from "react-router-dom";
import { Button, Typography } from "antd";
import { GoogleOutlined } from "@ant-design/icons";
import { env } from "@/config/env";
import { authService } from "@/services/auth";
import type { TProtectedRouteState } from "@/components/ProtectedRoute";
import styles from "./LoginPage.module.scss";

function LoginPage() {
  const location = useLocation();

  /**
   * Full page navigation, not an API call — the backend needs the browser to
   * follow redirects through Google's consent screen before it can send the
   * user back to `/auth/callback` with a token. The intended destination
   * (set by `ProtectedRoute`, if that's how the user got here) is persisted
   * rather than passed through router state, since it needs to survive that
   * round trip.
   */
  const handleContinueWithGoogle = () => {
    const state = location.state as TProtectedRouteState | null;
    authService.setPostLoginRedirect(state?.from ?? null);
    window.location.href = `${env.VITE_API_BASE_URL}/auth/google`;
  };

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
