import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { env } from "@/config/env";

export type TApiError = {
  status: number | null;
  code: string | null;
  message: string;
  data: unknown;
};

export class ApiService {
  private static instance: ApiService;

  public readonly api: AxiosInstance;

  private getAuthToken: (() => string | null) | null = null;
  private onUnauthorized: (() => void) | null = null;

  private constructor() {
    this.api = axios.create({
      baseURL: env.VITE_API_BASE_URL,
      timeout: env.VITE_API_TIMEOUT,
    });

    this.api.interceptors.request.use(this.attachAuth);
    this.api.interceptors.response.use((response) => response, this.normalizeError);
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /** Wire up auth from the app layer so this module stays dependency-free. */
  configureAuth(getToken: () => string | null, onUnauthorized?: () => void): void {
    this.getAuthToken = getToken;
    this.onUnauthorized = onUnauthorized ?? null;
  }

  private attachAuth = (config: InternalAxiosRequestConfig) => {
    const token = this.getAuthToken?.();

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
  };

  private normalizeError = (error: unknown) => {
    if (!(error instanceof AxiosError)) {
      return Promise.reject(error);
    }

    const status = error.response?.status ?? null;

    if (status === 401) {
      this.onUnauthorized?.();
    }

    const apiError: TApiError = {
      status,
      code: error.code ?? null,
      message: error.message,
      data: error.response?.data ?? null,
    };

    return Promise.reject(Object.assign(error, { apiError }));
  };
}

export const apiService = ApiService.getInstance();

/** Convenience handle — `api.get(...)` rather than `apiService.api.get(...)`. */
export const api = apiService.api;
