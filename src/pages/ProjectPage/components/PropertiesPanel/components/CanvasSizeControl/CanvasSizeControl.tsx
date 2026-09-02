import { memo, useState } from "react";
import { Button, ColorPicker, Flex, InputNumber, Select, Typography } from "antd";
import {
  ASPECT_RATIO_LABELS,
  ASPECT_RATIO_PRESET,
  ASPECT_RATIO_SIZES,
  CANVAS_MAX_DIMENSION,
  CANVAS_MIN_DIMENSION,
  type TAspectRatioPreset,
} from "@/services/canvas/canvas.constants";
import type { TCanvas } from "@/services/canvas/canvas.types";
import styles from "./CanvasSizeControl.module.scss";

export type TCanvasSizeControlProps = {
  canvas: TCanvas;
  canEdit: boolean;
  onResize: (width: number, height: number, preset: TAspectRatioPreset) => void;
  onBackgroundChange: (color: string) => void;
};

const PRESET_OPTIONS = Object.values(ASPECT_RATIO_PRESET).map((preset) => ({
  value: preset,
  label:
    preset === ASPECT_RATIO_PRESET.CUSTOM
      ? ASPECT_RATIO_LABELS[preset]
      : `${ASPECT_RATIO_LABELS[preset]} · ${ASPECT_RATIO_SIZES[preset].width}×${ASPECT_RATIO_SIZES[preset].height}`,
}));

/** Workspace dimensions. Shown in the right panel whenever nothing is selected. */
function CanvasSizeControl({ canvas, canEdit, onResize, onBackgroundChange }: TCanvasSizeControlProps) {
  /**
   * Only the user's in-progress edit is state; the committed size always comes
   * from `canvas`. Mirroring the props into state and re-syncing in an effect
   * would mean a cascading render on every peer resize — and clearing the draft
   * on commit is all the "re-sync" this actually needs.
   */
  const [draft, setDraft] = useState<{ width: number; height: number } | null>(null);

  const width = draft?.width ?? canvas.width;
  const height = draft?.height ?? canvas.height;

  const handlePreset = (preset: TAspectRatioPreset): void => {
    setDraft(null);

    if (preset === ASPECT_RATIO_PRESET.CUSTOM) {
      onResize(width, height, preset);
      return;
    }

    const size = ASPECT_RATIO_SIZES[preset];
    onResize(size.width, size.height, preset);
  };

  const handleApply = (): void => {
    onResize(width, height, ASPECT_RATIO_PRESET.CUSTOM);
    setDraft(null);
  };

  const isDirty = width !== canvas.width || height !== canvas.height;

  return (
    <Flex vertical gap={16} data-testid="canvas-size-control">
      <Typography.Text strong>Workspace</Typography.Text>

      <Flex vertical gap={8}>
        <Typography.Text type="secondary">Size preset</Typography.Text>
        <Select
          size="small"
          value={canvas.aspectRatioPreset ?? ASPECT_RATIO_PRESET.CUSTOM}
          disabled={!canEdit}
          options={PRESET_OPTIONS}
          onChange={handlePreset}
          data-testid="aspect-ratio-select"
        />
      </Flex>

      <Flex vertical gap={8}>
        <Typography.Text type="secondary">Custom size</Typography.Text>
        <Flex gap={8}>
          <InputNumber
            size="small"
            prefix="W"
            min={CANVAS_MIN_DIMENSION}
            max={CANVAS_MAX_DIMENSION}
            value={width}
            disabled={!canEdit}
            onChange={(value) => value !== null && setDraft({ width: Number(value), height })}
            data-testid="canvas-width-input"
          />
          <InputNumber
            size="small"
            prefix="H"
            min={CANVAS_MIN_DIMENSION}
            max={CANVAS_MAX_DIMENSION}
            value={height}
            disabled={!canEdit}
            onChange={(value) => value !== null && setDraft({ width, height: Number(value) })}
            data-testid="canvas-height-input"
          />
        </Flex>
        {/* Applied on click rather than on change: resizing on every keystroke
            would broadcast a resize per digit typed. */}
        <Button
          size="small"
          block
          disabled={!canEdit || !isDirty}
          onClick={handleApply}
          data-testid="apply-canvas-size"
        >
          Apply size
        </Button>
      </Flex>

      <Flex vertical gap={8}>
        <Typography.Text type="secondary">Background</Typography.Text>
        <ColorPicker
          value={canvas.backgroundColor}
          disabled={!canEdit}
          showText
          onChangeComplete={(color) => onBackgroundChange(color.toHexString())}
          data-testid="canvas-background-picker"
        />
      </Flex>

      <Typography.Text type="secondary" className={styles["hint"] ?? ""}>
        Select an element to edit its style.
      </Typography.Text>
    </Flex>
  );
}

export default memo(CanvasSizeControl);
