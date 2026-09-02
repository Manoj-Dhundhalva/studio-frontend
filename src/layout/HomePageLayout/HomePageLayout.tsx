import { memo } from "react";
import { Outlet } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { Layout } from "antd";
import ErrorFallback from "@/components/ErrorFallback";
import Navbar from "@/layout/Navbar";
import Footer from "./components/Footer";
import styles from "./HomePageLayout.module.scss";

function HomePageLayout() {
  return (
    <Layout className={styles["homepage-layout"]}>
      <Layout.Header className={styles["header"]}>
        <Navbar />
      </Layout.Header>
      <Layout.Content className={styles["content"]}>
        {/* Scoped to the page so a route crash keeps the nav usable. */}
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Outlet />
        </ErrorBoundary>
      </Layout.Content>
      <Layout.Footer className={styles["footer"]}>
        <Footer />
      </Layout.Footer>
    </Layout>
  );
}

export default memo(HomePageLayout);
