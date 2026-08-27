import { z } from "zod";

export const APP_STAGE = {
  STAGING: "staging",
  PROD: "prod",
} as const;

const envSchema = z.object({
  VITE_APP_ENV: z.enum([APP_STAGE.STAGING, APP_STAGE.PROD]).default(APP_STAGE.STAGING),

  VITE_API_BASE_URL: z.url(),
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

export default env;
