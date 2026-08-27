import { z } from "zod";
import { UI_PREFERENCES } from "@/constants/ui-preferences.constants";
import { getSystemTheme } from "./theme";

/**
 * Defaults and `.catch()` live on the *leaves*, never on the root object.
 * A root-level `.catch()` would discard every persisted preference the moment
 * a single new field is added to the schema.
 */
export const GlobalStateSchema = z.object({
  uiPreferences: z
    .object({
      theme: z.enum(UI_PREFERENCES.THEME).catch(getSystemTheme),
    })
    .catch(() => ({ theme: getSystemTheme() })),
});

export type TGlobalState = z.infer<typeof GlobalStateSchema>;

/** Always returns a fresh object — never hand out a shared mutable default. */
export function createInitialGlobalState(): TGlobalState {
  return GlobalStateSchema.parse({});
}

/** Parses anything read back from storage, falling back per-field. */
export function parseGlobalState(input: unknown): TGlobalState {
  const result = GlobalStateSchema.safeParse(input ?? {});

  if (result.success) return result.data;

  // Every top-level slice carries its own `.catch()`, so reaching here means a
  // slice was added without one — a schema bug rather than bad stored data.
  console.error("Invalid persisted global state; falling back to defaults", result.error);

  return createInitialGlobalState();
}
