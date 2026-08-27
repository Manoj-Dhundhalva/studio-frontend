import { Suspense, lazy, useEffect, useMemo } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { App as AntdApp, ConfigProvider, Flex, Spin, theme as antdTheme } from "antd";
import { THEME } from "@/constants/ui-preferences.constants";
import { useGlobalState } from "@/contexts/global";
import { setAntdStatic } from "@/lib/antd-static";
import ErrorFallback from "@/components/ErrorFallback";
import HomePageLayout from "@/layout/HomePageLayout";

// The layout shell stays eager so the chrome paints immediately; pages are
// split out of the entry chunk.
const HomePage = lazy(() => import("@/pages/HomePage"));
const PageNotFound = lazy(() => import("@/components/PageNotFound"));

const PAGE_FALLBACK = (
  <Flex align="center" justify="center" style={{ minHeight: "40dvh" }}>
    <Spin size="large" />
  </Flex>
);

/** Publishes antd's context-aware message/notification/modal to non-React code. */
function AntdStaticBridge() {
  const staticApi = AntdApp.useApp();

  useEffect(() => {
    setAntdStatic(staticApi);
    return () => setAntdStatic(null);
  }, [staticApi]);

  return null;
}

function App() {
  const {
    uiPreferences: { theme },
  } = useGlobalState();

  const themeConfig = useMemo(
    () => ({ algorithm: theme === THEME.DARK ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }),
    [theme],
  );

  return (
    <ConfigProvider theme={themeConfig}>
      {/* component={false} renders no wrapper element, so the layout keeps full height. */}
      <AntdApp component={false}>
        <AntdStaticBridge />
        {/* Inside ConfigProvider so the fallback UI is themed like the rest of the app. */}
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <BrowserRouter>
            <Suspense fallback={PAGE_FALLBACK}>
              <Routes>
                <Route path="/" element={<HomePageLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="*" element={<PageNotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
