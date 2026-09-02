/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: "staging" | "prod";
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT?: string;
  readonly VITE_SOCKET_URL: string;
}
