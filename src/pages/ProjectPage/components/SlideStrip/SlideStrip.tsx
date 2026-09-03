import { memo } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useAppSelector } from "@/store";
import { selectSlides } from "@/store/slices/slides.slice";
import type { useSlideMutations } from "../../hooks/useSlideMutations.hook";
import SlideThumbnail from "../SlideThumbnail";
import styles from "./SlideStrip.module.scss";

export type TSlideStripProps = {
  projectId: string;
  activeCanvasId: string;
  canEdit: boolean;
  mutations: ReturnType<typeof useSlideMutations>;
};

/**
 * The Canva-style bottom strip: live thumbnails, drag-to-reorder, add,
 * duplicate, and delete. The heavy lifting (per-slide state, network calls)
 * lives in `useSlideMutations` — this component is just the layout and the
 * dnd-kit wiring.
 */
function SlideStrip({ projectId, activeCanvasId, canEdit, mutations }: TSlideStripProps) {
  const slides = useAppSelector((state) => selectSlides(state, projectId));

  // A small movement threshold, so a plain click-to-select isn't swallowed as
  // the start of a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const ids = slides.map((slide) => slide.canvasId);
    const fromIndex = ids.indexOf(String(active.id));
    const toIndex = ids.indexOf(String(over.id));

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    const nextIds = arrayMove(ids, fromIndex, toIndex);

    mutations.reorderSlides(nextIds.map((canvasId, orderIndex) => ({ canvasId, orderIndex })));
  };

  return (
    <div className={styles["strip"] ?? ""} data-testid="slide-strip">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slides.map((slide) => slide.canvasId)} strategy={horizontalListSortingStrategy}>
          {slides.map((slide, index) => (
            <SlideThumbnail
              key={slide.canvasId}
              canvasId={slide.canvasId}
              index={index}
              isActive={slide.canvasId === activeCanvasId}
              canEdit={canEdit}
              onSelect={mutations.switchActiveSlide}
              onDuplicate={mutations.duplicateSlide}
              onDelete={mutations.deleteSlide}
              onEnsureHydrated={mutations.ensureSlideHydrated}
            />
          ))}
        </SortableContext>
      </DndContext>

      {canEdit && (
        <Button
          className={styles["add"] ?? ""}
          icon={<PlusOutlined />}
          onClick={() => mutations.addSlide()}
          aria-label="Add slide"
          data-testid="add-slide"
        />
      )}
    </div>
  );
}

export default memo(SlideStrip);
