import { z } from "zod";
import { ProjectMemberRoleSchema } from "@/services/projects/projects.types";
import { ASPECT_RATIO_PRESET, ELEMENT_TYPE, TEXT_ALIGN } from "./canvas.constants";

export const ElementTypeSchema = z.enum(Object.values(ELEMENT_TYPE));

export const AspectRatioPresetSchema = z.enum(Object.values(ASPECT_RATIO_PRESET));

/**
 * Type-specific element fields. Mirrors the backend's `props` jsonb blob: one
 * object with every field optional rather than a discriminated union, because
 * the column is typed independently of the row's `type`. The per-type shape is
 * enforced where the type is known — at insertion and in the properties panel.
 */
export const ElementPropsSchema = z.object({
  text: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontStyle: z.string().optional(),
  align: z.enum(Object.values(TEXT_ALIGN)).optional(),
  lineHeight: z.number().optional(),

  src: z.string().optional(),
  naturalWidth: z.number().optional(),
  naturalHeight: z.number().optional(),

  numPoints: z.number().optional(),
  innerRadius: z.number().optional(),

  sides: z.number().optional(),

  points: z.array(z.number()).optional(),
});

export type TElementProps = z.infer<typeof ElementPropsSchema>;

export const CanvasElementSchema = z.object({
  elementId: z.string(),
  canvasId: z.string(),
  type: ElementTypeSchema,
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  opacity: z.number(),
  fill: z.string().nullable(),
  stroke: z.string().nullable(),
  strokeWidth: z.number(),
  cornerRadius: z.number(),
  zIndex: z.number(),
  props: ElementPropsSchema,
  version: z.number(),
  createdBy: z.string().nullable(),
});

export type TCanvasElement = z.infer<typeof CanvasElementSchema>;

export const CanvasSchema = z.object({
  canvasId: z.string(),
  projectId: z.string(),
  width: z.number(),
  height: z.number(),
  aspectRatioPreset: AspectRatioPresetSchema.nullable(),
  backgroundColor: z.string(),
  version: z.number(),
  /** Position among a project's slides. */
  orderIndex: z.number(),
});

export type TCanvas = z.infer<typeof CanvasSchema>;

/** One slide's full state, as returned by `GET /projects/:projectId/slides/:canvasId`. */
export const CanvasStateSchema = z.object({
  canvas: CanvasSchema,
  elements: z.array(CanvasElementSchema),
  accessibility: ProjectMemberRoleSchema,
});

export type TCanvasState = z.infer<typeof CanvasStateSchema>;

/** Every slide's metadata plus the active one's elements, as returned by `GET /projects/:projectId/slides`. */
export const SlidesStateSchema = z.object({
  slides: z.array(CanvasSchema),
  activeCanvasId: z.string(),
  elements: z.array(CanvasElementSchema),
  accessibility: ProjectMemberRoleSchema,
});

export type TSlidesState = z.infer<typeof SlidesStateSchema>;

export const CanvasUpdateResponseSchema = z.object({
  canvas: CanvasSchema,
});

/**
 * A partial element update.
 *
 * Every key carries an explicit `| undefined`: under `exactOptionalPropertyTypes`
 * a bare `?` means "absent", so this must mirror what a zod `.optional()`
 * actually infers or the two are not assignable.
 */
export type TElementPatch = {
  x?: number | undefined;
  y?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  rotation?: number | undefined;
  opacity?: number | undefined;
  fill?: string | null | undefined;
  stroke?: string | null | undefined;
  strokeWidth?: number | undefined;
  cornerRadius?: number | undefined;
  props?: TElementProps | undefined;
};

/** What the client sends to create an element. The id is minted client-side. */
export type TElementCreateInput = {
  elementId: string;
  type: TCanvasElement["type"];
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number | undefined;
  opacity?: number | undefined;
  fill?: string | null | undefined;
  stroke?: string | null | undefined;
  strokeWidth?: number | undefined;
  cornerRadius?: number | undefined;
  props?: TElementProps | undefined;
};

export type TElementOrderEntry = { elementId: string; zIndex: number };

export type TSlideOrderEntry = { canvasId: string; orderIndex: number };

export type TPoint = { x: number; y: number };

export type TSize = { width: number; height: number };
