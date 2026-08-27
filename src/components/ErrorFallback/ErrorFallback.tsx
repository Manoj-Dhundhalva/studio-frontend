import { Button, Result } from "antd";
import type { FallbackProps } from "react-error-boundary";
import { isProdEnv } from "@/config/env";
import styles from "./ErrorFallback.module.scss";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const detail = error instanceof Error ? error.message : String(error);

  return (
    <div className={styles["error-fallback"]}>
      <Result
        status="500"
        title="Something went wrong"
        // Internal error text is useful locally but shouldn't leak in production.
        subTitle={isProdEnv() ? "An unexpected error occurred. Please try again." : detail}
        extra={[
          <Button type="primary" key="retry" onClick={resetErrorBoundary}>
            Try Again
          </Button>,
          <Button key="reload" onClick={() => window.location.reload()}>
            Reload Page
          </Button>,
        ]}
      />
    </div>
  );
}

export default ErrorFallback;
