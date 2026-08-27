import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { STORAGE_KEY } from "@/constants/storage-key.constants";
import { THEME, type TTheme } from "@/constants/ui-preferences.constants";
import { storage } from "@/services/storage";
import { GlobalActionsContext, GlobalStateContext, type TGlobalActions } from "./context";
import { applyThemeToDocument } from "./theme";
import { parseGlobalState, type TGlobalState } from "./schema";

type TProps = {
  children: ReactNode;
};

function readPersistedState(): TGlobalState {
  return parseGlobalState(storage.get(STORAGE_KEY.GLOBAL_STATE));
}

export function GlobalStateProvider({ children }: TProps) {
  const [state, setState] = useState<TGlobalState>(readPersistedState);

  // The initial state was just read from storage (or defaulted), so there is
  // nothing to write back on mount.
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    storage.set(STORAGE_KEY.GLOBAL_STATE, state);
  }, [state]);

  useEffect(() => {
    applyThemeToDocument(state.uiPreferences.theme);
  }, [state.uiPreferences.theme]);

  // Keep other tabs of the same origin in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY.GLOBAL_STATE) return;

      isFirstRun.current = true; // Don't echo the change back to storage.
      setState(readPersistedState());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((theme: TTheme) => {
    setState((prev) => ({ ...prev, uiPreferences: { ...prev.uiPreferences, theme } }));
  }, []);

  const toggleTheme = useCallback(() => {
    setState((prev) => ({
      ...prev,
      uiPreferences: {
        ...prev.uiPreferences,
        theme: prev.uiPreferences.theme === THEME.DARK ? THEME.LIGHT : THEME.DARK,
      },
    }));
  }, []);

  const actions = useMemo<TGlobalActions>(() => ({ setState, setTheme, toggleTheme }), [setTheme, toggleTheme]);

  return (
    <GlobalActionsContext.Provider value={actions}>
      <GlobalStateContext.Provider value={state}>{children}</GlobalStateContext.Provider>
    </GlobalActionsContext.Provider>
  );
}
