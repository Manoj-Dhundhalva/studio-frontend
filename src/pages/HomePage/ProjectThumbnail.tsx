import { memo, useEffect, useRef, useState } from "react";
import { Group, Layer, Rect, Stage } from "react-konva";
import { useQuery } from "@tanstack/react-query";
import { FileImageOutlined } from "@ant-design/icons";
import { canvasService } from "@/services/canvas/canvas.service";
import ElementPrimitive from "@/pages/ProjectPage/components/ElementPrimitive";
import type { TCanvas, TCanvasElement } from "@/services/canvas/canvas.types";

type Props = {
  projectId: string;
};

function renderStage(size: { width: number; height: number }, slide: TCanvas, elements: TCanvasElement[]) {
  const scale = Math.min(size.width / slide.width, size.height / slide.height);
  const offsetX = (size.width - slide.width * scale) / 2;
  const offsetY = (size.height - slide.height * scale) / 2;
  return (
    <Stage width={size.width} height={size.height} listening={false}>
      <Layer listening={false}>
        <Rect x={0} y={0} width={size.width} height={size.height} fill="#e8e8e8" />
        <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale} listening={false}>
          <Rect x={0} y={0} width={slide.width} height={slide.height} fill={slide.backgroundColor} />
          {elements.map((element) => (
            <Group
              key={element.elementId}
              x={element.x}
              y={element.y}
              rotation={element.rotation}
              opacity={element.opacity}
              listening={false}
            >
              <ElementPrimitive element={element} />
            </Group>
          ))}
        </Group>
      </Layer>
    </Stage>
  );
}

function ProjectThumbnail({ projectId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { data } = useQuery({
    queryKey: ["slides-preview", projectId],
    queryFn: () => canvasService.getSlides(projectId),
    staleTime: 5 * 60 * 1000,
  });

  const slide = data?.slides?.[0];
  const elements = data?.elements ?? [];

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0 }}>
      {size && slide ? (
        renderStage(size, slide, elements)
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            fontSize: 32,
            color: "var(--app-fg)",
            opacity: 0.25,
          }}
        >
          <FileImageOutlined />
        </div>
      )}
    </div>
  );
}

export default memo(ProjectThumbnail);
