import type { App as AntdApp } from "antd";

/**
 * antd's static `message`/`notification`/`modal` exports do not read
 * ConfigProvider context, so they render unthemed. `<App>` provides
 * context-aware instances via `App.useApp()`, but those are only reachable from
 * inside a component — this holder bridges them out to non-React code
 * (utilities, interceptors) that needs to raise UI feedback.
 */
export type TAntdStatic = ReturnType<typeof AntdApp.useApp>;

let instance: TAntdStatic | null = null;

export function setAntdStatic(next: TAntdStatic | null): void {
  instance = next;
}

/** Null until <AntdStaticBridge /> has rendered. Callers must handle that. */
export function getAntdStatic(): TAntdStatic | null {
  return instance;
}
