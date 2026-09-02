import { Suspense, lazy, useMemo } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useToast } from "@/hooks/useToast.hook";
import { THEME } from "@/constants/ui-preferences.constants";
import { ROUTE_PATH } from "@/constants/route.constants";
import { useGlobalState } from "@/contexts/global";
import HomePageLayout from "@/layout/HomePageLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { App as AntdApp, ConfigProvider, Spin, theme as antdTheme } from "antd";

const EditorLayout = lazy(() => import("@/layout/EditorLayout"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ProjectPage = lazy(() => import("@/pages/ProjectPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));
const PageNotFound = lazy(() => import("@/components/PageNotFound"));

/**
 * A child of `AntdApp`, not a sibling — `useToast` reads the message API via
 * `App.useApp()`, which only resolves once there's an `AntdApp` ancestor.
 */
function AppRoutes() {
  useToast();

  return (
    <BrowserRouter>
      <Suspense fallback={<Spin />}>
        <Routes>
          <Route path={ROUTE_PATH.AUTH.ROOT} element={<HomePageLayout />}>
            <Route index element={<LoginPage />} />
            <Route path={ROUTE_PATH.AUTH.CALLBACK.ROOT} element={<AuthCallbackPage />} />
            <Route path="*" element={<LoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            {/* The editor gets its own full-bleed, non-scrolling shell. Pathless,
                so ROUTE_PATH.PROJECT.ROOT stays the absolute path it already is. */}
            <Route element={<EditorLayout />}>
              <Route path={ROUTE_PATH.PROJECT.ROOT} element={<ProjectPage />} />
            </Route>
            <Route path="/" element={<HomePageLayout />}>
              <Route index element={<HomePage />} />
              <Route path={ROUTE_PATH.PROFILE.ROOT} element={<ProfilePage />} />
              <Route path="*" element={<PageNotFound />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
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
      <AntdApp>
        <AppRoutes />
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
