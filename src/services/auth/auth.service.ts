import { STORAGE_KEY } from "@/constants/storage-key.constants";
import { storage } from "@/services/storage";

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
}

export const authService = AuthService.getInstance();
