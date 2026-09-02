/** Element kinds. Must stay in step with the backend's `canvas_element_type` enum. */
export const ELEMENT_TYPE = {
  RECT: "rect",
  ELLIPSE: "ellipse",
  TRIANGLE: "triangle",
  LINE: "line",
  ARROW: "arrow",
  STAR: "star",
  POLYGON: "polygon",
  TEXT: "text",
  IMAGE: "image",
  ICON: "icon",
} as const;

export type TElementType = (typeof ELEMENT_TYPE)[keyof typeof ELEMENT_TYPE];

export const TEXT_ALIGN = {
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
} as const;

export type TTextAlign = (typeof TEXT_ALIGN)[keyof typeof TEXT_ALIGN];

export const ASPECT_RATIO_PRESET = {
  SQUARE: "1:1",
  LANDSCAPE: "16:9",
  PORTRAIT: "9:16",
  A4: "a4",
  PRESENTATION: "4:3",
  CUSTOM: "custom",
} as const;

export type TAspectRatioPreset = (typeof ASPECT_RATIO_PRESET)[keyof typeof ASPECT_RATIO_PRESET];

/** Workspace dimensions for each preset. `custom` keeps whatever the user set. */
export const ASPECT_RATIO_SIZES: Record<Exclude<TAspectRatioPreset, "custom">, { width: number; height: number }> = {
  [ASPECT_RATIO_PRESET.SQUARE]: { width: 1080, height: 1080 },
  [ASPECT_RATIO_PRESET.LANDSCAPE]: { width: 1920, height: 1080 },
  [ASPECT_RATIO_PRESET.PORTRAIT]: { width: 1080, height: 1920 },
  [ASPECT_RATIO_PRESET.A4]: { width: 1240, height: 1754 },
  [ASPECT_RATIO_PRESET.PRESENTATION]: { width: 1440, height: 1080 },
};

export const ASPECT_RATIO_LABELS: Record<TAspectRatioPreset, string> = {
  [ASPECT_RATIO_PRESET.SQUARE]: "Square",
  [ASPECT_RATIO_PRESET.LANDSCAPE]: "Landscape",
  [ASPECT_RATIO_PRESET.PORTRAIT]: "Story",
  [ASPECT_RATIO_PRESET.A4]: "A4",
  [ASPECT_RATIO_PRESET.PRESENTATION]: "Slide",
  [ASPECT_RATIO_PRESET.CUSTOM]: "Custom",
};

export const CANVAS_MIN_DIMENSION = 64;
export const CANVAS_MAX_DIMENSION = 8000;

export const SYNC_STATUS = {
  SYNCED: "synced",
  SAVING: "saving",
  RECONNECTING: "reconnecting",
  OFFLINE: "offline",
} as const;

export type TSyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];

/** Smallest an element may be resized to, in canvas pixels. */
export const MIN_ELEMENT_SIZE = 8;

/**
 * The app's accent blue — mirrors `--accent-color` in `src/styles/index.css`.
 * Konva shapes can't read CSS custom properties, so this is the one place
 * that duplicates the value for canvas-rendered UI (selection outlines, etc).
 */
export const SELECTION_ACCENT_COLOR = "#1677ff";

export const DEFAULT_CANVAS = {
  width: 1080,
  height: 1080,
  backgroundColor: "#ffffff",
} as const;

export const DEFAULT_ELEMENT_STYLE = {
  fill: "#C8D1D9",
  stroke: "#000000",
  strokeWidth: 0,
  opacity: 1,
  rotation: 0,
} as const;

/** Default footprint for each kind when inserted from the left panel. */
export const ELEMENT_DEFAULT_SIZE: Record<TElementType, { width: number; height: number }> = {
  [ELEMENT_TYPE.RECT]: { width: 220, height: 150 },
  [ELEMENT_TYPE.ELLIPSE]: { width: 180, height: 180 },
  [ELEMENT_TYPE.TRIANGLE]: { width: 180, height: 160 },
  [ELEMENT_TYPE.LINE]: { width: 240, height: 2 },
  [ELEMENT_TYPE.ARROW]: { width: 240, height: 2 },
  [ELEMENT_TYPE.STAR]: { width: 180, height: 180 },
  [ELEMENT_TYPE.POLYGON]: { width: 180, height: 180 },
  [ELEMENT_TYPE.TEXT]: { width: 320, height: 56 },
  [ELEMENT_TYPE.IMAGE]: { width: 320, height: 240 },
  [ELEMENT_TYPE.ICON]: { width: 120, height: 120 },
};

export const ZOOM = {
  MIN: 0.1,
  MAX: 5,
  STEP: 1.15,
  /** Gap between the workspace and the viewport edge when fitting, in screen px. */
  FIT_PADDING: 48,
} as const;

/**
 * Outbound rate floor for drag/transform streams. A 165Hz display would
 * otherwise emit 165 updates/second per dragging user, which is far more than
 * the server's flush loop or peers can usefully consume.
 */
export const TRANSFORM_EMIT_INTERVAL_MS = 40;

export const DEFAULT_FONT_FAMILY = "Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

export const FONT_FAMILIES = [
  DEFAULT_FONT_FAMILY,
  "Georgia, serif",
  "Times New Roman, serif",
  "Courier New, monospace",
  "Impact, fantasy",
  "Comic Sans MS, cursive",
] as const;

/** Paired rather than two parallel arrays, so a glyph and its label can never drift out of sync. */
export const EMOJI_ICONS = [
  { glyph: "⭐", label: "star" },
  { glyph: "❤️", label: "heart" },
  { glyph: "🔥", label: "fire" },
  { glyph: "✨", label: "sparkles" },
  { glyph: "🎉", label: "celebration" },
  { glyph: "💡", label: "idea" },
  { glyph: "✅", label: "check" },
  { glyph: "❌", label: "cross" },
  { glyph: "⚡", label: "lightning" },
  { glyph: "🚀", label: "rocket" },
  { glyph: "🌈", label: "rainbow" },
  { glyph: "🍀", label: "clover" },
  { glyph: "☀️", label: "sun" },
  { glyph: "🌙", label: "moon" },
  { glyph: "☁️", label: "cloud" },
  { glyph: "🎯", label: "target" },
  { glyph: "🏆", label: "trophy" },
  { glyph: "🎨", label: "art" },
  { glyph: "📌", label: "pin" },
  { glyph: "🔔", label: "bell" },
  { glyph: "💬", label: "comment" },
  { glyph: "👍", label: "thumbs up" },
  { glyph: "👏", label: "clap" },
  { glyph: "🙌", label: "raised hands" },
] as const;
