import { memo } from "react";
import { Button, ColorPicker, Divider, Flex, InputNumber, Segmented, Select, Slider, Tooltip, Typography } from "antd";
import { DeleteOutlined, VerticalAlignBottomOutlined, VerticalAlignTopOutlined } from "@ant-design/icons";
import { ELEMENT_TYPE, FONT_FAMILIES, TEXT_ALIGN, type TTextAlign } from "@/services/canvas/canvas.constants";
import type { TCanvasElement, TElementPatch } from "@/services/canvas/canvas.types";
import CanvasSizeControl from "./components/CanvasSizeControl";
import type { TCanvasSizeControlProps } from "./components/CanvasSizeControl/CanvasSizeControl";
import styles from "./PropertiesPanel.module.scss";

export type TPropertiesPanelProps = {
  canEdit: boolean;
  selection: TCanvasElement[];
  onCommit: (elementId: string, patch: TElementPatch) => void;
  onDelete: () => void;
  onReorder: (direction: "front" | "back") => void;
  canvasSizeProps: TCanvasSizeControlProps;
};

/** antd's ColorPicker hands back an AggregationColor; only the hex is stored. */
const toHex = (value: { toHexString: () => string }): string => value.toHexString();

function PropertiesPanel({
  canEdit,
  selection,
  onCommit,
  onDelete,
  onReorder,
  canvasSizeProps,
}: TPropertiesPanelProps) {
  // With nothing selected the panel becomes the workspace settings, which is
  // where "change the ratio of the main body" lives.
  if (selection.length === 0) {
    return (
      <div className={styles["panel"] ?? ""} data-testid="properties-panel">
        <CanvasSizeControl {...canvasSizeProps} />
      </div>
    );
  }

  const primary = selection[0];

  if (!primary) {
    return null;
  }

  const isMulti = selection.length > 1;
  const isText = primary.type === ELEMENT_TYPE.TEXT;
  const isIcon = primary.type === ELEMENT_TYPE.ICON;
  const isStroked = primary.type === ELEMENT_TYPE.LINE || primary.type === ELEMENT_TYPE.ARROW;
  const supportsCornerRadius = primary.type === ELEMENT_TYPE.RECT || primary.type === ELEMENT_TYPE.IMAGE;

  /** Applies one patch to every selected element. */
  const commitAll = (patch: TElementPatch): void => {
    selection.forEach((element) => onCommit(element.elementId, patch));
  };

  return (
    <div className={styles["panel"] ?? ""} data-testid="properties-panel">
      <Flex vertical gap={16}>
        <Typography.Text strong>
          {isMulti
            ? `${selection.length} elements selected`
            : primary.type.charAt(0).toUpperCase() + primary.type.slice(1)}
        </Typography.Text>

        {!isIcon && (
          <Flex vertical gap={8}>
            <Typography.Text type="secondary">{isStroked ? "Color" : "Fill"}</Typography.Text>
            <ColorPicker
              value={isStroked ? primary.stroke : primary.fill}
              disabled={!canEdit}
              showText
              onChangeComplete={(color) => commitAll(isStroked ? { stroke: toHex(color) } : { fill: toHex(color) })}
              data-testid="fill-color-picker"
            />
          </Flex>
        )}

        {!isStroked && !isIcon && (
          <Flex vertical gap={8}>
            <Typography.Text type="secondary">Border</Typography.Text>
            <Flex align="center" gap={8}>
              <ColorPicker
                value={primary.stroke ?? "#000000"}
                disabled={!canEdit}
                onChangeComplete={(color) => commitAll({ stroke: toHex(color) })}
              />
              <Slider
                className={styles["slider"] ?? ""}
                min={0}
                max={40}
                value={primary.strokeWidth}
                disabled={!canEdit}
                onChangeComplete={(value) => commitAll({ strokeWidth: Number(value) })}
              />
            </Flex>
          </Flex>
        )}

        {isStroked && (
          <Flex vertical gap={8}>
            <Typography.Text type="secondary">Thickness</Typography.Text>
            <Slider
              min={1}
              max={40}
              value={primary.strokeWidth}
              disabled={!canEdit}
              onChangeComplete={(value) => commitAll({ strokeWidth: Number(value) })}
            />
          </Flex>
        )}

        {supportsCornerRadius && (
          <Flex vertical gap={8}>
            <Typography.Text type="secondary">Corner radius</Typography.Text>
            <Slider
              min={0}
              max={Math.floor(Math.min(primary.width, primary.height) / 2)}
              value={primary.cornerRadius}
              disabled={!canEdit}
              onChangeComplete={(value) => commitAll({ cornerRadius: Number(value) })}
            />
          </Flex>
        )}

        <Flex vertical gap={8}>
          <Typography.Text type="secondary">Opacity</Typography.Text>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={primary.opacity}
            disabled={!canEdit}
            onChangeComplete={(value) => commitAll({ opacity: Number(value) })}
          />
        </Flex>

        {isText && (
          <>
            <Divider className={styles["divider"] ?? ""} />
            <Flex vertical gap={8}>
              <Typography.Text type="secondary">Font</Typography.Text>
              <Select
                size="small"
                value={primary.props.fontFamily ?? FONT_FAMILIES[0]}
                disabled={!canEdit}
                options={FONT_FAMILIES.map((family) => ({
                  value: family,
                  // Shows each option in its own face.
                  label: <span style={{ fontFamily: family }}>{family.split(",")[0]}</span>,
                }))}
                onChange={(family) => commitAll({ props: { ...primary.props, fontFamily: family } })}
              />
              <Flex align="center" gap={8}>
                <InputNumber
                  size="small"
                  min={8}
                  max={400}
                  value={primary.props.fontSize ?? 40}
                  disabled={!canEdit}
                  onChange={(value) =>
                    value !== null && commitAll({ props: { ...primary.props, fontSize: Number(value) } })
                  }
                  data-testid="font-size-input"
                />
                <Segmented
                  size="small"
                  value={primary.props.align ?? TEXT_ALIGN.LEFT}
                  disabled={!canEdit}
                  options={[
                    { value: TEXT_ALIGN.LEFT, label: "L" },
                    { value: TEXT_ALIGN.CENTER, label: "C" },
                    { value: TEXT_ALIGN.RIGHT, label: "R" },
                  ]}
                  onChange={(align) => commitAll({ props: { ...primary.props, align: align as TTextAlign } })}
                />
              </Flex>
              <Segmented
                size="small"
                value={primary.props.fontStyle ?? "normal"}
                disabled={!canEdit}
                options={[
                  { value: "normal", label: "Normal" },
                  { value: "bold", label: <strong>Bold</strong> },
                  { value: "italic", label: <em>Italic</em> },
                ]}
                onChange={(style) => commitAll({ props: { ...primary.props, fontStyle: String(style) } })}
              />
            </Flex>
          </>
        )}

        <Divider className={styles["divider"] ?? ""} />

        <Flex vertical gap={8}>
          <Typography.Text type="secondary">Position &amp; size</Typography.Text>
          <Flex gap={8}>
            <InputNumber
              size="small"
              prefix="X"
              value={Math.round(primary.x)}
              disabled={!canEdit || isMulti}
              onChange={(value) => value !== null && onCommit(primary.elementId, { x: Number(value) })}
            />
            <InputNumber
              size="small"
              prefix="Y"
              value={Math.round(primary.y)}
              disabled={!canEdit || isMulti}
              onChange={(value) => value !== null && onCommit(primary.elementId, { y: Number(value) })}
            />
          </Flex>
          <Flex gap={8}>
            <InputNumber
              size="small"
              prefix="W"
              min={1}
              value={Math.round(primary.width)}
              disabled={!canEdit || isMulti}
              onChange={(value) => value !== null && onCommit(primary.elementId, { width: Number(value) })}
            />
            <InputNumber
              size="small"
              prefix="H"
              min={1}
              value={Math.round(primary.height)}
              disabled={!canEdit || isMulti}
              onChange={(value) => value !== null && onCommit(primary.elementId, { height: Number(value) })}
            />
          </Flex>
          {/* Label sits outside the field: a "Rotation" prefix leaves too little
              room for the value and truncates it. */}
          <Flex align="center" gap={8}>
            <Typography.Text type="secondary" className={styles["field-label"] ?? ""}>
              Rotation
            </Typography.Text>
            <InputNumber
              size="small"
              className={styles["field-input"] ?? ""}
              suffix="°"
              min={-360}
              max={360}
              value={Math.round(primary.rotation)}
              disabled={!canEdit || isMulti}
              onChange={(value) => value !== null && onCommit(primary.elementId, { rotation: Number(value) })}
              data-testid="rotation-input"
            />
          </Flex>
        </Flex>

        <Divider className={styles["divider"] ?? ""} />

        <Flex gap={8}>
          <Tooltip title="Bring to front">
            <Button
              size="small"
              disabled={!canEdit}
              icon={<VerticalAlignTopOutlined />}
              onClick={() => onReorder("front")}
              data-testid="bring-to-front"
            />
          </Tooltip>
          <Tooltip title="Send to back">
            <Button
              size="small"
              disabled={!canEdit}
              icon={<VerticalAlignBottomOutlined />}
              onClick={() => onReorder("back")}
              data-testid="send-to-back"
            />
          </Tooltip>
          <Button
            size="small"
            danger
            disabled={!canEdit}
            icon={<DeleteOutlined />}
            onClick={onDelete}
            data-testid="delete-element"
          >
            Delete
          </Button>
        </Flex>
      </Flex>
    </div>
  );
}

export default memo(PropertiesPanel);
