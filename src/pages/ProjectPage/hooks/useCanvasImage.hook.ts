import { useEffect, useState } from "react";

type TImageStatus = "idle" | "loading" | "loaded" | "failed";

/** The outcome of one load, tagged with the src it belongs to. */
type TImageResult = { src: string; image: HTMLImageElement | null };

/**
 * Loads an `HTMLImageElement` for Konva's `<Image>`.
 *
 * Hand-written rather than pulling in `use-image`: it's ~30 lines, and the
 * dependency would exist solely for this.
 *
 * The result is tagged with its `src` and `status` is *derived* rather than
 * stored, so the effect never has to set state synchronously on mount — which
 * would trigger a cascading render on every element that has an image.
 */
export const useCanvasImage = (
  src: string | undefined,
): { image: HTMLImageElement | undefined; status: TImageStatus } => {
  const [result, setResult] = useState<TImageResult | null>(null);

  useEffect(() => {
    if (!src) {
      return;
    }

    const element = new Image();
    let isActive = true;

    // Without this a cross-origin image taints the canvas, which would break
    // any later export to PNG.
    element.crossOrigin = "anonymous";

    element.onload = () => {
      if (isActive) {
        setResult({ src, image: element });
      }
    };

    element.onerror = () => {
      if (isActive) {
        setResult({ src, image: null });
      }
    };

    element.src = src;

    return () => {
      // Guards against a slow load resolving after the src changed or the node
      // unmounted.
      isActive = false;
      element.onload = null;
      element.onerror = null;
    };
  }, [src]);

  if (!src) {
    return { image: undefined, status: "idle" };
  }

  // A result for a previous src is still "loading" as far as this src goes.
  if (result?.src !== src) {
    return { image: undefined, status: "loading" };
  }

  return result.image ? { image: result.image, status: "loaded" } : { image: undefined, status: "failed" };
};
