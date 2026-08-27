import { createContext, type Dispatch, type SetStateAction } from "react";
import type { TTheme } from "@/constants/ui-preferences.constants";
import type { TGlobalState } from "./schema";

export type TGlobalActions = {
  setState: Dispatch<SetStateAction<TGlobalState>>;
  setTheme: (theme: TTheme) => void;
  toggleTheme: () => void;
};

/**
 * State and actions are deliberately separate contexts: actions have a stable
 * identity, so components that only dispatch (e.g. ThemeToggle) never re-render
 * when unrelated global state changes.
 */
export const GlobalStateContext = createContext<TGlobalState | null>(null);
export const GlobalActionsContext = createContext<TGlobalActions | null>(null);
