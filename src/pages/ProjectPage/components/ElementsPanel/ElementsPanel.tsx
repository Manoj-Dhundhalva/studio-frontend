import { memo, useState } from "react";
import { Button, Collapse, Flex, Input, Typography } from "antd";
import {
  ArrowRightOutlined,
  BorderOutlined,
  FontSizeOutlined,
  LineOutlined,
  PictureOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { ELEMENT_TYPE, EMOJI_GLYPHS, type TElementType } from "@/services/canvas/canvas.constants";
import type { TElementProps } from "@/services/canvas/canvas.types";
import { utils } from "@/utils";
import styles from "./ElementsPanel.module.scss";

export type TElementsPanelProps = {
  canEdit: boolean;
  onAdd: (type: TElementType, props?: TElementProps) => void;
};

type TShapeRow = {
  type: TElementType;
  label: string;
  icon: React.ReactNode;
};

/** Rows in the shapes section, in the order they appear. */
const SHAPE_ROWS: TShapeRow[] = [
  { type: ELEMENT_TYPE.RECT, label: "Rectangle", icon: <BorderOutlined /> },
  { type: ELEMENT_TYPE.ELLIPSE, label: "Circle", icon: <span className={styles["glyph-circle"] ?? ""} /> },
  { type: ELEMENT_TYPE.TRIANGLE, label: "Triangle", icon: <span className={styles["glyph-triangle"] ?? ""} /> },
  { type: ELEMENT_TYPE.POLYGON, label: "Polygon", icon: <span className={styles["glyph-hexagon"] ?? ""} /> },
  { type: ELEMENT_TYPE.STAR, label: "Star", icon: <StarOutlined /> },
  { type: ELEMENT_TYPE.LINE, label: "Line", icon: <LineOutlined /> },
  { type: ELEMENT_TYPE.ARROW, label: "Arrow", icon: <ArrowRightOutlined /> },
];

function ElementsPanel({ canEdit, onAdd }: TElementsPanelProps) {
  const [imageUrl, setImageUrl] = useState("");

  const handleAddImage = () => {
    const trimmed = imageUrl.trim();

    if (!trimmed) {
      return;
    }

    try {
      // Validated here so an obviously broken URL never becomes an element that
      // silently renders as an empty placeholder.
      new URL(trimmed);
    } catch {
      utils.toast.error("Enter a valid image URL.");
      return;
    }

    onAdd(ELEMENT_TYPE.IMAGE, { src: trimmed });
    setImageUrl("");
  };

  return (
    <div className={styles["panel"] ?? ""} data-testid="elements-panel">
      <Collapse
        defaultActiveKey={["shapes", "text", "icons"]}
        ghost
        size="small"
        items={[
          {
            key: "shapes",
            label: "Shapes",
            children: (
              <Flex vertical gap={2}>
                {SHAPE_ROWS.map((row) => (
                  <Button
                    key={row.type}
                    type="text"
                    block
                    disabled={!canEdit}
                    icon={row.icon}
                    className={styles["row"] ?? ""}
                    onClick={() => onAdd(row.type)}
                    data-testid={`add-${row.type}`}
                  >
                    <span className={styles["row-label"] ?? ""}>{row.label}</span>
                  </Button>
                ))}
              </Flex>
            ),
          },
          {
            key: "text",
            label: "Text",
            children: (
              <Button
                type="text"
                block
                disabled={!canEdit}
                icon={<FontSizeOutlined />}
                className={styles["row"] ?? ""}
                onClick={() => onAdd(ELEMENT_TYPE.TEXT)}
                data-testid="add-text"
              >
                <span className={styles["row-label"] ?? ""}>Add a text box</span>
              </Button>
            ),
          },
          {
            key: "icons",
            label: "Icons",
            children: (
              <div className={styles["emoji-grid"] ?? ""}>
                {EMOJI_GLYPHS.map((glyph) => (
                  <Button
                    key={glyph}
                    type="text"
                    disabled={!canEdit}
                    className={styles["emoji-button"] ?? ""}
                    onClick={() => onAdd(ELEMENT_TYPE.ICON, { text: glyph })}
                    aria-label={`Add ${glyph}`}
                  >
                    {glyph}
                  </Button>
                ))}
              </div>
            ),
          },
          {
            key: "image",
            label: "Image",
            children: (
              <Flex vertical gap={8}>
                <Typography.Text type="secondary" className={styles["hint"] ?? ""}>
                  Paste an image URL
                </Typography.Text>
                <Input
                  size="small"
                  placeholder="https://…"
                  value={imageUrl}
                  disabled={!canEdit}
                  onChange={(event) => setImageUrl(event.target.value)}
                  onPressEnter={handleAddImage}
                  data-testid="image-url-input"
                />
                <Button
                  size="small"
                  block
                  disabled={!canEdit || imageUrl.trim().length === 0}
                  icon={<PictureOutlined />}
                  onClick={handleAddImage}
                  data-testid="add-image"
                >
                  Add image
                </Button>
              </Flex>
            ),
          },
        ]}
      />
    </div>
  );
}

export default memo(ElementsPanel);
