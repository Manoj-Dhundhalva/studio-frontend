import { memo } from "react";
import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { Layout } from "antd";
import ErrorFallback from "@/components/ErrorFallback";
import Navbar from "@/layout/Navbar";
import styles from "./EditorLayout.module.scss";

/**
 * Full-bleed, non-scrolling shell for the canvas editor.
 *
 * A separate layout rather than a modifier on `HomePageLayout`: that shell
 * carries horizontal page padding, vertical content padding, a footer, and
 * `min-height: 100dvh`, all of which an editor has to fight. Keeping the navbar
 * means live presence still has a home.
 */
function EditorLayout() {
  return (
    <Layout className={styles["editor-layout"]}>
      <Layout.Header className={styles["header"]}>
        <Navbar />
      </Layout.Header>
      <Layout.Content className={styles["content"]}>
        {/* Scoped to the page so a canvas crash keeps the nav usable. */}
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Outlet />
        </ErrorBoundary>
      </Layout.Content>
    </Layout>
  );
}

export default memo(EditorLayout);
