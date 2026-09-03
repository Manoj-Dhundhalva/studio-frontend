import { memo, useState } from "react";
import { Button, Divider, Flex, Popover, Tooltip, Typography } from "antd";
import {
  ExportOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  Html5Outlined,
  LoadingOutlined,
} from "@ant-design/icons";

import { useAppSelector } from "@/store";
import { selectProject } from "@/store/slices/project.slice";
import { selectSlides, selectActiveCanvasId } from "@/store/slices/slides.slice";
import { selectCanvas, selectElement, selectElementOrder } from "@/store/slices/canvas.slice";
import { canvasService } from "@/services/canvas";
import { exportService } from "@/services/export";
import { renderSlideToDataURL, downloadDataURL } from "@/utils/slideRenderer.utils";
import type { TCanvas, TCanvasElement } from "@/services/canvas/canvas.types";
import type { RootState } from "@/store/store";
import { utils } from "@/utils";
import styles from "./ExportPopover.module.scss";

export type TExportPopoverProps = {
  projectId: string;
};

type TExportFormat = "png" | "jpeg" | "pdf" | "pptx" | "html";

function ExportPopover({ projectId }: TExportPopoverProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<TExportFormat | null>(null);

  const project = useAppSelector((state) => selectProject(state, projectId));
  const slides = useAppSelector((state) => selectSlides(state, projectId));
  const activeCanvasId = useAppSelector((state) => selectActiveCanvasId(state, projectId)) ?? "";
  const activeCanvas = useAppSelector((state) => selectCanvas(state, activeCanvasId));
  const activeOrder = useAppSelector((state) => selectElementOrder(state, activeCanvasId));
  const activeElements = useAppSelector((state: RootState) =>
    activeOrder
      .map((elementId) => selectElement(state, activeCanvasId, elementId))
      .filter((el): el is TCanvasElement => el !== null),
  );

  const projectName = project?.projectName ?? "Untitled";

  const handleExport = async (format: TExportFormat) => {
    if (loading) return;
    setLoading(format);
    setOpen(false);

    try {
      if (format === "png" || format === "jpeg") {
        if (!activeCanvas) {
          utils.toast.error("No active slide to export");
          return;
        }
        const mimeType = format === "png" ? "image/png" : "image/jpeg";
        const dataURL = await renderSlideToDataURL(activeCanvas, activeElements, mimeType);
        downloadDataURL(dataURL, `${projectName}.${format}`);
        utils.toast.success(`Exported as ${format.toUpperCase()}`);
        return;
      }

      if (format === "pdf") {
        await exportAsPdf(slides, projectId, projectName);
        utils.toast.success("Exported as PDF");
        return;
      }

      if (format === "pptx") {
        await exportService.downloadPptx(projectId, projectName);
        utils.toast.success("Exported as PowerPoint");
        return;
      }

      if (format === "html") {
        await exportAsHtml(slides, projectId, projectName);
        utils.toast.success("Exported as HTML");
      }
    } catch (error) {
      utils.toast.error(error instanceof Error ? error.message : "Export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const isLoading = (format: TExportFormat) => loading === format;
  const anyLoading = loading !== null;

  const content = (
    <Flex vertical gap={4} className={styles["popover-content"]}>
      <Typography.Text className={styles["section-label"]}>Image</Typography.Text>

      <ExportOption
        icon={<FileImageOutlined />}
        label="PNG"
        description="Current slide · lossless"
        loading={isLoading("png")}
        disabled={anyLoading}
        onClick={() => void handleExport("png")}
      />
      <ExportOption
        icon={<FileImageOutlined />}
        label="JPEG"
        description="Current slide · smaller file"
        loading={isLoading("jpeg")}
        disabled={anyLoading}
        onClick={() => void handleExport("jpeg")}
      />

      <Divider className={styles["divider"]} />

      <Typography.Text className={styles["section-label"]}>Document</Typography.Text>

      <ExportOption
        icon={<FilePdfOutlined />}
        label="PDF"
        description={`All ${slides.length} slide${slides.length === 1 ? "" : "s"}`}
        loading={isLoading("pdf")}
        disabled={anyLoading}
        onClick={() => void handleExport("pdf")}
      />
      <ExportOption
        icon={<FilePptOutlined />}
        label="PowerPoint"
        description={`All ${slides.length} slide${slides.length === 1 ? "" : "s"} · .pptx`}
        loading={isLoading("pptx")}
        disabled={anyLoading}
        onClick={() => void handleExport("pptx")}
      />
      <ExportOption
        icon={<Html5Outlined />}
        label="HTML"
        description={`All ${slides.length} slide${slides.length === 1 ? "" : "s"} · self-contained`}
        loading={isLoading("html")}
        disabled={anyLoading}
        onClick={() => void handleExport("html")}
      />
    </Flex>
  );

  return (
    <Popover
      content={content}
      title="Export"
      open={open}
      onOpenChange={(next) => !anyLoading && setOpen(next)}
      trigger="click"
      placement="bottomRight"
    >
      <Tooltip title="Export" placement="bottom">
        <Button
          icon={anyLoading ? <LoadingOutlined /> : <ExportOutlined />}
          shape="circle"
          variant="filled"
          color="default"
          aria-label="Export"
          data-testid="export-button"
        />
      </Tooltip>
    </Popover>
  );
}

type TExportOptionProps = {
  icon: React.ReactNode;
  label: string;
  description: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
};

function ExportOption({ icon, label, description, loading, disabled, onClick }: TExportOptionProps) {
  return (
    <Button
      type="text"
      icon={loading ? <LoadingOutlined /> : icon}
      onClick={onClick}
      disabled={disabled}
      className={styles["export-option"]}
      block
    >
      <Flex vertical align="flex-start" gap={0}>
        <Typography.Text className={styles["option-label"]}>{label}</Typography.Text>
        <Typography.Text type="secondary" className={styles["option-desc"]}>
          {description}
        </Typography.Text>
      </Flex>
    </Button>
  );
}

async function exportAsPdf(slides: readonly TCanvas[], projectId: string, projectName: string): Promise<void> {
  // Dynamically import jsPDF to avoid bloating the main bundle
  const { jsPDF } = await import("jspdf");

  if (slides.length === 0) {
    throw new Error("No slides to export");
  }

  const firstMeta = slides[0]!;
  const { canvas: firstCanvas, elements: firstElements } = await canvasService.getSlide(projectId, firstMeta.canvasId);

  const doc = new jsPDF({
    orientation: firstCanvas.width >= firstCanvas.height ? "landscape" : "portrait",
    unit: "px",
    format: [firstCanvas.width, firstCanvas.height],
  });

  const firstDataURL = await renderSlideToDataURL(firstCanvas, firstElements, "image/png", 1);
  doc.addImage(firstDataURL, "PNG", 0, 0, firstCanvas.width, firstCanvas.height);

  for (let i = 1; i < slides.length; i++) {
    const meta = slides[i]!;
    const { canvas, elements } = await canvasService.getSlide(projectId, meta.canvasId);
    doc.addPage([canvas.width, canvas.height], canvas.width >= canvas.height ? "landscape" : "portrait");
    const dataURL = await renderSlideToDataURL(canvas, elements, "image/png", 1);
    doc.addImage(dataURL, "PNG", 0, 0, canvas.width, canvas.height);
  }

  doc.save(`${projectName}.pdf`);
}

async function exportAsHtml(slides: readonly TCanvas[], projectId: string, projectName: string): Promise<void> {
  if (slides.length === 0) {
    throw new Error("No slides to export");
  }

  const slideParts: string[] = [];

  for (const meta of slides) {
    const { canvas, elements } = await canvasService.getSlide(projectId, meta.canvasId);
    const dataURL = await renderSlideToDataURL(canvas, elements, "image/png", 2);
    slideParts.push(
      `<div class="slide" style="width:${canvas.width}px;height:${canvas.height}px"><img src="${dataURL}" width="${canvas.width}" height="${canvas.height}" alt="Slide" /></div>`,
    );
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(projectName)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1a1a;display:flex;flex-direction:column;align-items:center;padding:32px 16px;gap:24px;font-family:system-ui,sans-serif}
.slide{box-shadow:0 4px 24px rgba(0,0,0,.4);max-width:100%}
.slide img{display:block;max-width:100%;height:auto}
@media print{body{background:#fff;padding:0;gap:0}.slide{box-shadow:none;page-break-after:always}}
</style>
</head>
<body>
${slideParts.join("\n")}
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default memo(ExportPopover);
