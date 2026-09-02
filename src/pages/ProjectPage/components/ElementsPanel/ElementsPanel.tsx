import { memo, useState } from "react";
import { Button, Flex, Input, Typography } from "antd";
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  BorderOutlined,
  FontSizeOutlined,
  LineOutlined,
  PictureOutlined,
  SmileOutlined,
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

type TToolKey = "shapes" | "text" | "icons" | "image";

type TTool = {
  key: TToolKey;
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

const TOOLS: TTool[] = [
  { key: "shapes", label: "Shapes", icon: <AppstoreOutlined /> },
  { key: "text", label: "Text", icon: <FontSizeOutlined /> },
  { key: "icons", label: "Icons", icon: <SmileOutlined /> },
  { key: "image", label: "Image", icon: <PictureOutlined /> },
];

const ICON_LABELS = [
  "star",
  "heart",
  "fire",
  "sparkles",
  "celebration",
  "idea",
  "check",
  "cross",
  "lightning",
  "rocket",
  "rainbow",
  "clover",
  "sun",
  "moon",
  "cloud",
  "target",
  "trophy",
  "art",
  "pin",
  "bell",
  "comment",
  "thumbs up",
  "clap",
  "raised hands",
] as const;

const fuzzyMatches = (value: string, query: string): boolean => {
  let valueIndex = 0;
  const normalizedValue = value.toLocaleLowerCase();

  for (const character of query.toLocaleLowerCase()) {
    valueIndex = normalizedValue.indexOf(character, valueIndex);
    if (valueIndex === -1) return false;
    valueIndex += 1;
  }

  return true;
};

function ElementsPanel({ canEdit, onAdd }: TElementsPanelProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [activeTool, setActiveTool] = useState<TToolKey>("shapes");
  const [shapeSearch, setShapeSearch] = useState("");
  const [iconSearch, setIconSearch] = useState("");

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

  const filteredShapes = SHAPE_ROWS.filter((row) => fuzzyMatches(row.label, shapeSearch.trim()));
  const filteredIcons = EMOJI_GLYPHS.map((glyph, index) => ({
    glyph,
    label: ICON_LABELS[index] ?? glyph,
  })).filter((option) => fuzzyMatches(`${option.label} ${option.glyph}`, iconSearch.trim()));

  return (
    <div className={styles["panel"] ?? ""} data-testid="elements-panel">
      <div className={styles["tool-layout"] ?? ""}>
        <nav className={styles["tool-rail"] ?? ""} aria-label="Element tools">
          {TOOLS.map((tool) => (
            <Button
              key={tool.key}
              type={activeTool === tool.key ? "primary" : "text"}
              className={styles["tool-button"] ?? ""}
              icon={tool.icon}
              onClick={() => setActiveTool(tool.key)}
              aria-label={tool.label}
              aria-pressed={activeTool === tool.key}
            >
              <span className={styles["tool-label"] ?? ""}>{tool.label}</span>
            </Button>
          ))}
        </nav>

        <div className={styles["tool-content"] ?? ""}>
          <Typography.Title level={5} className={styles["title"] ?? ""}>
            {TOOLS.find((tool) => tool.key === activeTool)?.label}
          </Typography.Title>

          {activeTool === "shapes" && (
            <Flex vertical gap={8}>
              <Input
                size="small"
                allowClear
                placeholder="Search shapes"
                value={shapeSearch}
                onChange={(event) => setShapeSearch(event.target.value)}
                data-testid="shape-search"
              />
              <Flex vertical gap={2}>
                {filteredShapes.map((row) => (
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
            </Flex>
          )}

          {activeTool === "text" && (
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
          )}

          {activeTool === "icons" && (
            <Flex vertical gap={8}>
              <Input
                size="small"
                allowClear
                placeholder="Search icons"
                value={iconSearch}
                onChange={(event) => setIconSearch(event.target.value)}
                data-testid="icon-search"
              />
              <div className={styles["emoji-grid"] ?? ""}>
                {filteredIcons.map(({ glyph, label }) => (
                  <Button
                    key={glyph}
                    type="text"
                    disabled={!canEdit}
                    className={styles["emoji-button"] ?? ""}
                    onClick={() => onAdd(ELEMENT_TYPE.ICON, { text: glyph })}
                    aria-label={`Add ${label}`}
                  >
                    {glyph}
                  </Button>
                ))}
              </div>
            </Flex>
          )}

          {activeTool === "image" && (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ElementsPanel);
