import { Suspense, lazy, memo, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Flex, Skeleton, Typography } from "antd";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  REQUEST_STATUS,
  fetchProject,
  selectProject,
  selectProjectError,
  selectProjectStatus,
} from "@/store/slices/project.slice";
import {
  canvasReplaced,
  selectCanvas,
  selectElement,
  selectElementOrder,
  selectPendingCount,
  selectSelectedIds,
  selectSyncStatus,
} from "@/store/slices/canvas.slice";
import { selectActiveCanvasId } from "@/store/slices/slides.slice";
import { selectPresenceSockets, selectSelfSocketId } from "@/store/slices/presence.slice";
import { PROJECT_ROLE } from "@/services/projects/projects.types";
import { canvasService, type TAspectRatioPreset, type TElementType } from "@/services/canvas";
import type { TCanvasElement, TElementProps } from "@/services/canvas/canvas.types";
import { SOCKET_EVENT, socketService } from "@/services/socket";
import type { RootState } from "@/store/store";
import { utils } from "@/utils";
import { buildReorder, createElementInput } from "./ProjectPage.utils";
import { useAiAssistant } from "./hooks/useAiAssistant.hook";
import { useCanvasRoom } from "./hooks/useCanvasRoom.hook";
import { useElementMutations } from "./hooks/useElementMutations.hook";
import { useMediaLibrary } from "./hooks/useMediaLibrary.hook";
import { useSlideMutations } from "./hooks/useSlideMutations.hook";
import ElementsPanel from "./components/ElementsPanel";
import PropertiesPanel from "./components/PropertiesPanel";
import SlideStrip from "./components/SlideStrip";
import SyncIndicator from "./components/SyncIndicator";
import styles from "./ProjectPage.module.scss";

/**
 * Konva is ~110KB gzipped, so the stage is split out of the page chunk too —
 * the shell, navbar and panels paint before it downloads.
 */
const CanvasStage = lazy(() => import("./components/CanvasStage"));

function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const dispatch = useAppDispatch();

  const project = useAppSelector((state) => (projectId ? selectProject(state, projectId) : null));
  const status = useAppSelector((state) => (projectId ? selectProjectStatus(state, projectId) : REQUEST_STATUS.IDLE));
  const error = useAppSelector((state) => (projectId ? selectProjectError(state, projectId) : null));

  const isInitialLoading = status === REQUEST_STATUS.LOADING && !project;

  useEffect(() => {
    if (projectId && status === REQUEST_STATUS.IDLE) {
      void dispatch(fetchProject(projectId));
    }
  }, [projectId, status, dispatch]);

  if (!projectId) {
    return null;
  }

  if (isInitialLoading) {
    return <Skeleton active className={styles["project-page"] ?? ""} data-testid="project-loading" />;
  }

  if (status === REQUEST_STATUS.FAILED && !project) {
    return (
      <Flex vertical align="center" gap={8} className={styles["error-state"] ?? ""} data-testid="project-error">
        <Typography.Text type="danger">{error ?? "Failed to load project."}</Typography.Text>
        <Button type="link" onClick={() => void dispatch(fetchProject(projectId))}>
          Retry
        </Button>
      </Flex>
    );
  }

  // Keyed on projectId so navigating between projects remounts the editor and
  // its room subscription rather than trying to migrate one in place.
  return <ProjectEditor key={projectId} projectId={projectId} />;
}

type TProjectEditorProps = {
  projectId: string;
};

function ProjectEditorComponent({ projectId }: TProjectEditorProps) {
  const dispatch = useAppDispatch();

  const project = useAppSelector((state) => selectProject(state, projectId));
  const activeCanvasId = useAppSelector((state) => selectActiveCanvasId(state, projectId));
  // Every canvas-slice read below is scoped to the active slide, not the
  // project — a project can hold many slides, each with its own entity.
  const canvasId = activeCanvasId ?? "";
  const canvas = useAppSelector((state) => selectCanvas(state, canvasId));
  const order = useAppSelector((state) => selectElementOrder(state, canvasId));
  const selectedIds = useAppSelector((state) => selectSelectedIds(state, canvasId));
  const syncStatus = useAppSelector((state) => selectSyncStatus(state, canvasId));
  const pendingCount = useAppSelector((state) => selectPendingCount(state, canvasId));
  const presenceSockets = useAppSelector((state) => selectPresenceSockets(state, projectId));
  const selfSocketId = useAppSelector((state) => selectSelfSocketId(state, projectId));

  /**
   * Derived from the project's own `accessibility` — the requester's role, which
   * `access:changed` patches in place — so a demotion takes effect without a
   * refetch. This gates the UI only; the server re-checks every mutation.
   */
  const canEdit = project !== null && project.accessibility !== PROJECT_ROLE.VIEWER;

  const [leftPanelWidth, setLeftPanelWidth] = useState(320);

  const handlePanelResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = leftPanelWidth;

      const onMouseMove = (event: MouseEvent) => {
        const newWidth = Math.max(220, Math.min(560, startWidth + event.clientX - startX));
        setLeftPanelWidth(newWidth);
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [leftPanelWidth],
  );

  const { remoteSelections } = useCanvasRoom(projectId);
  const { addElement, previewElement, commitElement, removeElements, reorderElements, setSelection } =
    useElementMutations(projectId, canvasId, canEdit);
  const slideMutations = useSlideMutations(projectId, canEdit);
  const { media, isLoading: isMediaLoading, pendingUploads, uploadMedia, deleteMedia } = useMediaLibrary(projectId);
  // Jump to the first slide the AI just made, so a deck request visibly lands
  // instead of leaving the user on an unchanged slide. `slide:generated` has
  // already hydrated the entity, so this takes the no-round-trip fast path.
  const handleSlidesGenerated = useCallback(
    (canvasIds: string[]) => {
      const [firstCanvasId] = canvasIds;

      if (firstCanvasId) {
        slideMutations.switchActiveSlide(firstCanvasId);
      }
    },
    [slideMutations],
  );

  const {
    messages: aiMessages,
    isLoading: isAiLoading,
    isSending: isAiSending,
    sendMessage: sendAiMessage,
  } = useAiAssistant(projectId, canvasId, { onSlidesGenerated: handleSlidesGenerated });

  const selection = useAppSelector((state: RootState) =>
    selectedIds
      .map((elementId) => selectElement(state, canvasId, elementId))
      .filter((element): element is TCanvasElement => element !== null),
  );

  const handleAdd = useCallback(
    (type: TElementType, props?: TElementProps) => {
      if (!canvas) {
        return;
      }

      addElement(createElementInput(type, canvas, props ? { props } : undefined, order.length));
    },
    [addElement, canvas, order.length],
  );

  const handleDelete = useCallback(() => {
    removeElements([...selectedIds]);
  }, [removeElements, selectedIds]);

  const handleReorder = useCallback(
    (direction: "front" | "back") => {
      reorderElements(buildReorder(order, selectedIds, direction));
    },
    [reorderElements, order, selectedIds],
  );

  const handleResize = useCallback(
    (width: number, height: number, preset: TAspectRatioPreset) => {
      socketService.emit(
        SOCKET_EVENT.CLIENT.CANVAS_RESIZE,
        { projectId, canvasId, width, height, aspectRatioPreset: preset },
        (result) => {
          if (!result.ok) {
            utils.toast.error(result.error);
            return;
          }

          /**
           * Applied from the ack, not from the broadcast: `canvas:resized` is
           * filtered out for its own originating socket (echo suppression), so
           * without this the resizing user is the one person who never sees
           * their own resize.
           */
          dispatch(canvasReplaced({ canvasId, canvas: result.data.canvas }));
        },
      );
    },
    [dispatch, projectId, canvasId],
  );

  const handleBackgroundChange = useCallback(
    (color: string) => {
      // Background has no socket event of its own — the REST path writes through
      // the same server cache and broadcasts the result to live editors.
      void canvasService
        .updateSlide(projectId, canvasId, { backgroundColor: color })
        .then((updated) => {
          dispatch(canvasReplaced({ canvasId, canvas: updated }));
        })
        .catch((updateError: unknown) => {
          utils.toast.error(updateError instanceof Error ? updateError.message : "Failed to update background");
        });
    },
    [dispatch, projectId, canvasId],
  );

  // Delete / Escape, and arrow-key nudging.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;

      // Never hijack keys while the user is typing in a panel input.
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === "Escape") {
        setSelection([]);
        return;
      }

      if (!canEdit || selectedIds.length === 0) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeElements([...selectedIds]);
        return;
      }

      const nudge = event.shiftKey ? 10 : 1;
      const deltas: Record<string, { x: number; y: number }> = {
        ArrowUp: { x: 0, y: -nudge },
        ArrowDown: { x: 0, y: nudge },
        ArrowLeft: { x: -nudge, y: 0 },
        ArrowRight: { x: nudge, y: 0 },
      };
      const delta = deltas[event.key];

      if (!delta) {
        return;
      }

      event.preventDefault();
      selection.forEach((element) => {
        commitElement(element.elementId, { x: element.x + delta.x, y: element.y + delta.y });
      });
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEdit, selectedIds, selection, removeElements, commitElement, setSelection, dispatch]);

  const canvasSizeProps = useMemo(
    () => (canvas ? { canvas, canEdit, onResize: handleResize, onBackgroundChange: handleBackgroundChange } : null),
    [canvas, canEdit, handleResize, handleBackgroundChange],
  );

  if (!canvas || !canvasSizeProps || !activeCanvasId) {
    return <Skeleton active className={styles["project-page"] ?? ""} data-testid="canvas-loading" />;
  }

  return (
    <Flex vertical className={styles["editor"] ?? ""} data-testid="project-page">
      <div className={styles["editor-body"] ?? ""} style={{ gridTemplateColumns: `${leftPanelWidth}px 1fr 280px` }}>
        <div className={styles["left-panel-wrapper"] ?? ""}>
          <ElementsPanel
            canEdit={canEdit}
            onAdd={handleAdd}
            media={media}
            isMediaLoading={isMediaLoading}
            pendingUploads={pendingUploads}
            onUploadMedia={uploadMedia}
            onDeleteMedia={deleteMedia}
            aiMessages={aiMessages}
            isAiLoading={isAiLoading}
            isAiSending={isAiSending}
            onSendAiMessage={sendAiMessage}
          />
          <div className={styles["panel-resize-handle"] ?? ""} onMouseDown={handlePanelResizeStart} />
        </div>

        <Suspense fallback={<Skeleton active className={styles["stage-fallback"] ?? ""} />}>
          <CanvasStage
            projectId={projectId}
            canvasId={activeCanvasId}
            canvas={canvas}
            canEdit={canEdit}
            selectedIds={selectedIds}
            remoteSelections={remoteSelections}
            presenceSockets={presenceSockets}
            selfSocketId={selfSocketId}
            onSelect={setSelection}
            onPreview={previewElement}
            onCommit={commitElement}
          />
        </Suspense>

        <PropertiesPanel
          canEdit={canEdit}
          selection={selection}
          onCommit={commitElement}
          onDelete={handleDelete}
          onReorder={handleReorder}
          canvasSizeProps={canvasSizeProps}
        />
      </div>

      <SlideStrip projectId={projectId} activeCanvasId={activeCanvasId} canEdit={canEdit} mutations={slideMutations} />

      <div className={styles["editor-status"] ?? ""}>
        <SyncIndicator status={syncStatus} pendingCount={pendingCount} />
      </div>
    </Flex>
  );
}

const ProjectEditor = memo(ProjectEditorComponent);

export default memo(ProjectPage);
