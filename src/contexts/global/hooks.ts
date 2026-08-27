import { useContext } from "react";
import type { TTheme } from "@/constants/ui-preferences.constants";
import { GlobalActionsContext, GlobalStateContext, type TGlobalActions } from "./context";
import type { TGlobalState } from "./schema";

/** Subscribes to global state. Re-renders whenever any part of it changes. */
export function useGlobalState(): TGlobalState {
  const state = useContext(GlobalStateContext);

  if (!state) {
    throw new Error("useGlobalState must be used within GlobalStateProvider");
  }

  return state;
}

/** Stable action handles. Using this alone never causes a re-render. */
export function useGlobalActions(): TGlobalActions {
  const actions = useContext(GlobalActionsContext);

  if (!actions) {
    throw new Error("useGlobalActions must be used within GlobalStateProvider");
  }

  return actions;
}

export function useTheme(): [TTheme, TGlobalActions["setTheme"], TGlobalActions["toggleTheme"]] {
  const {
    uiPreferences: { theme },
  } = useGlobalState();
  const { setTheme, toggleTheme } = useGlobalActions();

  return [theme, setTheme, toggleTheme];
}
