import { z } from "zod";

export const APP_STAGE = {
  STAGING: "staging",
  PROD: "prod",
} as const;

const DEFAULT_API_TIMEOUT_MS = 30 * 1000;

const envSchema = z.object({
  VITE_APP_ENV: z.enum([APP_STAGE.STAGING, APP_STAGE.PROD]).default(APP_STAGE.STAGING),

  VITE_API_BASE_URL: z.url({
    protocol: /^https?$/,
    error: "VITE_API_BASE_URL must be an absolute http:// or https:// URL",
  }),

  VITE_API_TIMEOUT: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : DEFAULT_API_TIMEOUT_MS))
    .refine((value) => Number.isInteger(value) && value > 0, {
      message: "VITE_API_TIMEOUT must be a positive integer (milliseconds)",
    }),

  /**
   * Socket origin, declared separately rather than derived by stripping `/api`
   * off `VITE_API_BASE_URL`. That derivation only works by coincidence locally
   * and breaks the moment the API sits behind a path prefix, another subdomain,
   * or a CDN that fronts REST but not WebSocket. Note `http(s)`, not `ws(s)` —
   * socket.io takes an HTTP origin and upgrades.
   */
  VITE_SOCKET_URL: z.url({
    protocol: /^https?$/,
    error: "VITE_SOCKET_URL must be an absolute http:// or https:// URL",
  }),
});

const result = envSchema.safeParse(import.meta.env);

if (!result.success) {
  console.error("❌ Invalid environment variables\n");
  console.error(z.prettifyError(result.error));

  throw new Error("Invalid environment variables. See console output above.");
}

export const env = result.data;

export type Env = typeof env;

export const isProdEnv = () => env.VITE_APP_ENV === APP_STAGE.PROD;
export const isStagingEnv = () => env.VITE_APP_ENV === APP_STAGE.STAGING;
