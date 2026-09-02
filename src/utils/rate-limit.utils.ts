type TAnyArgs = readonly unknown[];

/**
 * Collapses every call within one animation frame into a single invocation with
 * the most recent arguments.
 *
 * Preferred over a fixed-interval throttle for pointer-driven streams: it
 * self-tunes to the display refresh rate, and because browsers stop firing
 * `requestAnimationFrame` in background tabs, it stops emitting entirely when
 * the editor isn't visible rather than quietly burning bandwidth.
 *
 * Hand-written because the repo has no lodash. Exported as a plain function
 * rather than hung off the `utils` aggregate in `utils/index.ts`, which composes
 * stateful singletons behind getters — a pure factory doesn't belong there.
 */
export function createRafCoalescer<A extends TAnyArgs>(callback: (...args: A) => void) {
  let frameId: number | null = null;
  let latestArgs: A | null = null;

  const flush = (): void => {
    frameId = null;

    if (!latestArgs) {
      return;
    }

    const args = latestArgs;
    latestArgs = null;
    callback(...args);
  };

  const schedule = (...args: A): void => {
    latestArgs = args;

    if (frameId !== null) {
      return;
    }

    frameId = requestAnimationFrame(flush);
  };

  schedule.cancel = (): void => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
    }

    frameId = null;
    latestArgs = null;
  };

  return schedule;
}

/**
 * Leading-edge throttle with a trailing flush.
 *
 * Used as a *floor* beneath the rAF coalescer for outbound element mutations: a
 * 165Hz display would otherwise emit 165 `element:update` messages a second per
 * dragging user, far more than the server's flush loop or the peers can
 * usefully consume.
 */
export function createThrottle<A extends TAnyArgs>(callback: (...args: A) => void, waitMs: number) {
  let lastCallAt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let trailingArgs: A | null = null;

  const invoke = (args: A): void => {
    lastCallAt = Date.now();
    callback(...args);
  };

  const throttled = (...args: A): void => {
    const elapsed = Date.now() - lastCallAt;

    if (elapsed >= waitMs) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      invoke(args);
      return;
    }

    trailingArgs = args;

    if (timer) {
      return;
    }

    timer = setTimeout(() => {
      timer = null;

      if (trailingArgs) {
        const pending = trailingArgs;
        trailingArgs = null;
        invoke(pending);
      }
    }, waitMs - elapsed);
  };

  /**
   * Must be called before the final authoritative emit of a gesture. Otherwise
   * a queued trailing frame lands *after* the committed geometry and the
   * element visibly jumps back a few pixels for every observer.
   */
  throttled.cancel = (): void => {
    if (timer) {
      clearTimeout(timer);
    }

    timer = null;
    trailingArgs = null;
  };

  return throttled;
}

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
