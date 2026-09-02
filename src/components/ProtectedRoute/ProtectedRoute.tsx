import { memo } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authService } from "@/services/auth";
import { ROUTE_PATH } from "@/constants/route.constants";

export type TProtectedRouteState = {
  from: string;
};

/** Guards the authenticated route tree — a direct/deep link without a token bounces to login. */
function ProtectedRoute() {
  const location = useLocation();

  if (!authService.isAuthenticated()) {
    const from = `${location.pathname}${location.search}`;
    const state: TProtectedRouteState = { from };

    return <Navigate to={ROUTE_PATH.AUTH.LOGIN.ROOT} state={state} replace />;
  }

  return <Outlet />;
}

export default memo(ProtectedRoute);
