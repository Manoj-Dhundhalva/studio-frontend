import { THEME, UI_PREFERENCES, type TTheme } from "@/constants/ui-preferences.constants";

/** Class names this module owns on <html>, so it can clear them before setting one. */
const THEME_CLASS_NAMES = Object.values(UI_PREFERENCES.THEME);

export function getSystemTheme(): TTheme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? THEME.DARK : THEME.LIGHT;
}

/**
 * Mirrors the pre-paint script in index.html — keep the two in sync.
 * `colorScheme` is what makes native scrollbars and form controls follow the theme.
 */
export function applyThemeToDocument(theme: TTheme): void {
  const root = document.documentElement;

  root.classList.remove(...THEME_CLASS_NAMES);
  root.classList.add(theme);
  root.style.colorScheme = theme;
}
