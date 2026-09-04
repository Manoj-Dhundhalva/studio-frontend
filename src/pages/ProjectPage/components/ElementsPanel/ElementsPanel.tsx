import { memo, useRef, useState } from "react";
import { Button, Flex, Input, Popconfirm, Spin, Typography } from "antd";
import {
  AppstoreOutlined,
  ArrowRightOutlined,
  BorderOutlined,
  DeleteOutlined,
  FontSizeOutlined,
  GeminiFilled,
  LineOutlined,
  PictureOutlined,
  StarOutlined,
  UploadOutlined,
} from "@ant-design/icons";

import { ELEMENT_TYPE, type TElementType } from "@/services/canvas/canvas.constants";
import type { TElementProps } from "@/services/canvas/canvas.types";
import type { TProjectMedia } from "@/services/media/media.types";
import type { TAiMessage } from "@/services/ai/ai.types";
import type { TPendingMediaUpload } from "../../hooks/useMediaLibrary.hook";
import { utils } from "@/utils";
import AiChatPanel from "./AiChatPanel/AiChatPanel";
import styles from "./ElementsPanel.module.scss";

export type TElementsPanelProps = {
  canEdit: boolean;
  onAdd: (type: TElementType, props?: TElementProps) => void;
  media: readonly TProjectMedia[];
  isMediaLoading: boolean;
  pendingUploads: readonly TPendingMediaUpload[];
  onUploadMedia: (file: File) => void;
  onDeleteMedia: (mediaId: string) => Promise<void>;
  aiMessages: readonly TAiMessage[];
  isAiLoading: boolean;
  isAiSending: boolean;
  onSendAiMessage: (content: string) => void;
};

type TShapeRow = {
  type: TElementType;
  label: string;
  icon: React.ReactNode;
  props?: TElementProps;
};

type TToolKey = "shapes" | "text" | "image" | "uploads" | "ai";

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
  { type: ELEMENT_TYPE.DIAMOND, label: "Diamond", icon: <span className={styles["glyph-diamond"] ?? ""} /> },
  {
    type: ELEMENT_TYPE.PARALLELOGRAM,
    label: "Parallelogram",
    icon: <span className={styles["glyph-parallelogram"] ?? ""} />,
  },
  { type: ELEMENT_TYPE.TRAPEZOID, label: "Trapezoid", icon: <span className={styles["glyph-trapezoid"] ?? ""} /> },
  {
    type: ELEMENT_TYPE.POLYGON,
    label: "Pentagon",
    icon: <span className={styles["glyph-pentagon"] ?? ""} />,
    props: { sides: 5 },
  },
  { type: ELEMENT_TYPE.POLYGON, label: "Hexagon", icon: <span className={styles["glyph-hexagon"] ?? ""} /> },
  {
    type: ELEMENT_TYPE.POLYGON,
    label: "Octagon",
    icon: <span className={styles["glyph-octagon"] ?? ""} />,
    props: { sides: 8 },
  },
  { type: ELEMENT_TYPE.STAR, label: "Star", icon: <StarOutlined /> },
  { type: ELEMENT_TYPE.HEART, label: "Heart", icon: <span className={styles["glyph-heart"] ?? ""} /> },
  { type: ELEMENT_TYPE.CROSS, label: "Cross", icon: <span className={styles["glyph-cross"] ?? ""} /> },
  { type: ELEMENT_TYPE.CLOUD, label: "Cloud", icon: <span className={styles["glyph-cloud"] ?? ""} /> },
  { type: ELEMENT_TYPE.CALLOUT, label: "Callout", icon: <span className={styles["glyph-callout"] ?? ""} /> },
  { type: ELEMENT_TYPE.LINE, label: "Line", icon: <LineOutlined /> },
  { type: ELEMENT_TYPE.ARROW, label: "Arrow", icon: <ArrowRightOutlined /> },
];

const TOOLS: TTool[] = [
  { key: "shapes", label: "Shapes", icon: <AppstoreOutlined /> },
  { key: "text", label: "Text", icon: <FontSizeOutlined /> },
  { key: "image", label: "Image", icon: <PictureOutlined /> },
  { key: "uploads", label: "Uploads", icon: <UploadOutlined /> },
  { key: "ai", label: "AI", icon: <GeminiFilled /> },
];

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

function ElementsPanel({
  canEdit,
  onAdd,
  media,
  isMediaLoading,
  pendingUploads,
  onUploadMedia,
  onDeleteMedia,
  aiMessages,
  isAiLoading,
  isAiSending,
  onSendAiMessage,
}: TElementsPanelProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [activeTool, setActiveTool] = useState<TToolKey>("shapes");
  const [shapeSearch, setShapeSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    onUploadMedia(file);
  };

  const handleAddMedia = (item: TProjectMedia) => {
    onAdd(ELEMENT_TYPE.IMAGE, {
      src: item.url,
      naturalWidth: item.width ?? undefined,
      naturalHeight: item.height ?? undefined,
    });
  };

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

        <div
          className={`${styles["tool-content"] ?? ""} ${activeTool === "ai" ? (styles["tool-content-ai"] ?? "") : ""}`}
        >
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
                    key={`${row.type}-${row.label}`}
                    type="text"
                    block
                    disabled={!canEdit}
                    icon={row.icon}
                    className={styles["row"] ?? ""}
                    onClick={() => onAdd(row.type, row.props)}
                    data-testid={`add-${row.label.toLowerCase()}`}
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

          {activeTool === "uploads" && (
            <Flex vertical gap={8}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                onChange={handleFilePicked}
                data-testid="upload-file-input"
                hidden
              />
              <Button
                size="small"
                block
                disabled={!canEdit}
                icon={<UploadOutlined />}
                onClick={() => fileInputRef.current?.click()}
                data-testid="upload-media-button"
              >
                Upload
              </Button>

              {isMediaLoading ? (
                <Flex justify="center" className={styles["hint"] ?? ""}>
                  <Spin size="small" />
                </Flex>
              ) : media.length === 0 && pendingUploads.length === 0 ? (
                <Typography.Text type="secondary" className={styles["media-empty"] ?? ""}>
                  Files uploaded by anyone on this project show up here for everyone to use.
                </Typography.Text>
              ) : (
                <div className={styles["media-grid"] ?? ""} data-testid="media-grid">
                  {pendingUploads.map((pending) => (
                    <div
                      key={pending.localId}
                      className={styles["media-tile"] ?? ""}
                      aria-label={`Uploading ${pending.fileName}`}
                      data-testid={`media-pending-${pending.localId}`}
                    >
                      <img src={pending.previewUrl} alt={pending.fileName} className={styles["media-thumb"] ?? ""} />
                      <div className={styles["media-progress-track"] ?? ""}>
                        <div
                          className={styles["media-progress-fill"] ?? ""}
                          style={{ width: `${pending.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {media.map((item) => (
                    <div
                      key={item.mediaId}
                      className={styles["media-tile"] ?? ""}
                      onClick={() => handleAddMedia(item)}
                      role="button"
                      aria-label={`Insert ${item.fileName}`}
                      data-testid={`media-tile-${item.mediaId}`}
                    >
                      <img src={item.url} alt={item.fileName} className={styles["media-thumb"] ?? ""} />
                      {canEdit && (
                        <Popconfirm
                          title="Delete this upload?"
                          onConfirm={(event) => {
                            event?.stopPropagation();
                            void onDeleteMedia(item.mediaId);
                          }}
                          onCancel={(event) => event?.stopPropagation()}
                          okText="Delete"
                          cancelText="Cancel"
                        >
                          <Button
                            size="small"
                            type="text"
                            danger
                            className={styles["media-delete"] ?? ""}
                            icon={<DeleteOutlined />}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Delete ${item.fileName}`}
                          />
                        </Popconfirm>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Flex>
          )}

          {activeTool === "ai" && (
            <AiChatPanel
              canEdit={canEdit}
              messages={aiMessages}
              isLoading={isAiLoading}
              isSending={isAiSending}
              onSend={onSendAiMessage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ElementsPanel);
