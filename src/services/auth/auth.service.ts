import { STORAGE_KEY } from "@/constants/storage-key.constants";
import { storage } from "@/services/storage";

/** A same-origin, in-app path — rules out `//evil.com` (protocol-relative) and absolute URLs. */
const SAFE_REDIRECT_PATH = /^\/(?!\/)/;

/**
 * Thin wrapper around the persisted access token. Kept separate from
 * `ApiService` so the token's storage concern stays independent of how it's
 * attached to requests (see `ApiService.configureAuth`).
 */
class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  getToken = (): string | null => {
    return storage.get<string>(STORAGE_KEY.ACCESS_TOKEN);
  };

  setToken = (token: string): void => {
    storage.set(STORAGE_KEY.ACCESS_TOKEN, token);
  };

  clearToken = (): void => {
    storage.remove(STORAGE_KEY.ACCESS_TOKEN);
  };

  isAuthenticated = (): boolean => {
    return this.getToken() !== null;
  };

  /**
   * Remembers where `ProtectedRoute` redirected the user in from, so login
   * can send them back instead of always landing on home. Persisted (not
   * router state) because the Google OAuth leg is a full-page round trip.
   */
  setPostLoginRedirect = (path: string | null): void => {
    if (path && SAFE_REDIRECT_PATH.test(path)) {
      storage.set(STORAGE_KEY.POST_LOGIN_REDIRECT, path);
    } else {
      storage.remove(STORAGE_KEY.POST_LOGIN_REDIRECT);
    }
  };

  /** Reads and clears the redirect in one step — it's only ever meant to be used once. */
  consumePostLoginRedirect = (): string | null => {
    const path = storage.get<string>(STORAGE_KEY.POST_LOGIN_REDIRECT);
    storage.remove(STORAGE_KEY.POST_LOGIN_REDIRECT);
    return typeof path === "string" && SAFE_REDIRECT_PATH.test(path) ? path : null;
  };
}

export const authService = AuthService.getInstance();
