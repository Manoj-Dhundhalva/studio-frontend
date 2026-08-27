export const UI_PREFERENCES = {
  THEME: {
    LIGHT: "light",
    DARK: "dark",
  },
} as const;

export const { THEME } = UI_PREFERENCES;

export type TTheme = (typeof UI_PREFERENCES.THEME)[keyof typeof UI_PREFERENCES.THEME];
