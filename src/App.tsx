import { Suspense, lazy, useMemo } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useToast } from "@/hooks/useToast.hook";
import { THEME } from "@/constants/ui-preferences.constants";
import { ROUTE_PATH } from "@/constants/route.constants";
import { useGlobalState } from "@/contexts/global";
import HomePageLayout from "@/layout/HomePageLayout";
import { ConfigProvider, Spin, theme as antdTheme } from "antd";

const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));
const PageNotFound = lazy(() => import("@/components/PageNotFound"));

function App() {
  const {
    uiPreferences: { theme },
  } = useGlobalState();

  useToast();

  const themeConfig = useMemo(
    () => ({ algorithm: theme === THEME.DARK ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }),
    [theme],
  );

  return (
    <ConfigProvider theme={themeConfig}>
      <BrowserRouter>
        <Suspense fallback={<Spin />}>
          <Routes>
            <Route path={ROUTE_PATH.AUTH.ROOT} element={<HomePageLayout />}>
              <Route index element={<LoginPage />} />
              <Route path={ROUTE_PATH.AUTH.CALLBACK.ROOT} element={<AuthCallbackPage />} />
              <Route path="*" element={<LoginPage />} />
            </Route>
            <Route path="/" element={<HomePageLayout />}>
              <Route index element={<HomePage />} />
              <Route path="*" element={<PageNotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
