import { memo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Spin } from "antd";
import { authService } from "@/services/auth";
import { ROUTE_PATH } from "@/constants/route.constants";
import { utils } from "@/utils";
import { useAppDispatch } from "@/store";
import { fetchCurrentUser } from "@/store/slices/user.slice";
import styles from "./AuthCallbackPage.module.scss";

/**
 * The backend redirects here as `#access_token=...` (a fragment, not a query
 * string) so the token never reaches the server in a request log or the
 * `Referer` header of any subsequent navigation.
 *
 * Nike's "View & Edit" button also embeds an optional `redirect` param in the
 * same hash so the callback can land directly on the right project page:
 *   #access_token=TOKEN&redirect=/project/abc123
 */
function readHashParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.replace(/^#/, ""));
}

/** Only accept same-origin paths — rules out `//evil.com` or `https://...`. */
const SAFE_PATH = /^\/(?!\/)/;

function AuthCallbackPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Effects run twice under StrictMode in dev; without this guard the second
  // run would find the token already consumed from the hash and misreport a
  // failure.
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const params = readHashParams(window.location.hash);
    const token = params.get("access_token");

    if (!token) {
      utils.toast.error("Google sign-in failed. Please try again.");
      navigate(ROUTE_PATH.AUTH.LOGIN.ROOT, { replace: true });
      return;
    }

    authService.setToken(token);
    void dispatch(fetchCurrentUser());

    // Hash-embedded redirect (from Nike "View & Edit") takes priority over
    // whatever ProtectedRoute stashed in localStorage.
    const hashRedirect = params.get("redirect");
    const safePath = hashRedirect && SAFE_PATH.test(hashRedirect) ? hashRedirect : null;
    navigate(safePath ?? authService.consumePostLoginRedirect() ?? ROUTE_PATH.HOME.ROOT, { replace: true });
  }, [navigate, dispatch]);

  return (
    <div className={styles["auth-callback-page"]}>
      <Spin size="large" />
    </div>
  );
}

export default memo(AuthCallbackPage);
