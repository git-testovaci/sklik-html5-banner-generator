import type { BannerLayer, BannerLayerType } from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import type { TemplateAssetSlotKind } from "@/types/template-slots";
import {
  addLayerToScene,
  getActiveScene,
  getLayerById,
  newId,
  updateBannerLayer,
} from "@/lib/animation/storyboard-utils";
import {
  defaultInsertDurationMs,
  frontZIndexForScene,
  updateLayerTimelineRange,
} from "@/lib/animation/layer-timeline-utils";
import { getTemplateSlotLayers } from "@/lib/assets/slot-utils";

export type QuickAddLayerType =
  | "text"
  | "headline"
  | "subheadline"
  | "logo"
  | "product"
  | "cta"
  | "badge"
  | "underline"
  | "particle"
  | "shape";

export interface QuickAddOptions {
  selectedLayerId?: string;
  /** Playhead/scrub time in ms — layer timeline starts here. */
  startMs?: number;
}

function pad(state: BannerEditorState): number {
  return Math.max(12, Math.round(Math.min(state.width, state.height) * 0.08));
}

function baseLayer(
  state: BannerEditorState,
  type: BannerLayerType,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  extra: Partial<BannerLayer> = {},
): BannerLayer {
  return {
    id: newId("layer"),
    sceneId: getActiveScene(state)?.id,
    persistent: false,
    name,
    type,
    visible: true,
    locked: false,
    x,
    y,
    width,
    height,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: 25,
    ...extra,
  };
}

function slotMeta(
  kind: TemplateAssetSlotKind,
  label: string,
  persistent = false,
): Partial<BannerLayer> {
  return {
    isTemplateSlot: true,
    slotId: newId("slot"),
    slotKind: kind,
    slotLabel: label,
    persistent,
  };
}

function finalizeQuickLayer(
  state: BannerEditorState,
  layer: BannerLayer,
  startMs: number,
): { state: BannerEditorState; layer: BannerLayer } {
  let next = addLayerToScene(state, layer);
  const scene = getActiveScene(next);
  if (!scene) return { state: next, layer: getLayerById(next, layer.id)! };

  const zIndex = frontZIndexForScene(next, scene.id);
  next = updateBannerLayer(next, layer.id, { zIndex });
  const durationMs = defaultInsertDurationMs(scene.durationMs, startMs);
  next = updateLayerTimelineRange(next, scene.id, layer.id, startMs, durationMs);
  return { state: next, layer: getLayerById(next, layer.id)! };
}

export function createQuickLayer(
  state: BannerEditorState,
  kind: QuickAddLayerType,
  options: QuickAddOptions = {},
): { state: BannerEditorState; layer: BannerLayer; reused?: boolean } {
  const p = pad(state);
  const w = state.width;
  const h = state.height;
  const startMs = options.startMs ?? 0;

  if (kind === "logo") {
    const existing = getTemplateSlotLayers(state).find((s) => s.slotKind === "logo");
    if (existing) {
      return { state, layer: existing, reused: true };
    }
  }

  let layer: BannerLayer;

  switch (kind) {
    case "text":
      layer = baseLayer(state, "text", "Text", p, p, w - p * 2, Math.round(h * 0.12), {
        text: "Nový text",
        fontSize: Math.round(h * 0.05),
        fontWeight: 600,
      });
      break;
    case "headline":
      layer = baseLayer(
        state,
        "text",
        "Nadpis",
        p,
        p,
        w - p * 2,
        Math.round(h * 0.14),
        {
          text: state.headline || "Nadpis",
          fontSize: Math.round(h * 0.065),
          fontWeight: 700,
        },
      );
      break;
    case "subheadline":
      layer = baseLayer(
        state,
        "text",
        "Podnadpis",
        p,
        Math.round(h * 0.18),
        w - p * 2,
        Math.round(h * 0.1),
        {
          text: state.subheadline || "Podnadpis",
          fontSize: Math.round(h * 0.042),
          fontWeight: 500,
        },
      );
      break;
    case "logo":
      layer = baseLayer(
        state,
        "badge",
        "Logo",
        p,
        h - p - Math.round(h * 0.11),
        Math.round(w * 0.24),
        Math.round(h * 0.1),
        {
          fontSize: Math.round(h * 0.045),
          fontWeight: 700,
          textAlign: "center",
          legacyKey: "logo",
          persistent: true,
          ...slotMeta("logo", "Nahrát logo", true),
        },
      );
      break;
    case "product":
      layer = baseLayer(
        state,
        "badge",
        "Produkt",
        Math.round(w * 0.3),
        Math.round(h * 0.28),
        Math.round(w * 0.4),
        Math.round(h * 0.42),
        {
          legacyKey: "product",
          shadow: true,
          ...slotMeta("product", "Nahrát produkt"),
        },
      );
      break;
    case "cta":
      layer = baseLayer(
        state,
        "badge",
        "CTA",
        p,
        h - p - Math.round(h * 0.14),
        Math.round(w * 0.42),
        Math.round(h * 0.11),
        {
          text: state.cta || "Zjistit více",
          fontSize: Math.round(h * 0.055),
          fontWeight: 600,
          textAlign: "center",
          fill: state.ctaBackgroundColor,
          color: state.ctaTextColor,
          borderRadius: 6,
          paddingX: 12,
          paddingY: 6,
        },
      );
      break;
    case "badge":
      layer = baseLayer(
        state,
        "badge",
        "Štítek",
        Math.round(w * 0.68),
        Math.round(h * 0.18),
        Math.round(w * 0.22),
        Math.round(w * 0.22),
        {
          text: "Novinka",
          fill: state.accentColor,
          fontSize: 11,
          fontWeight: 700,
          textAlign: "center",
          shapeType: "circle",
        },
      );
      break;
    case "underline": {
      const anchor = options.selectedLayerId
        ? getLayerById(state, options.selectedLayerId)
        : undefined;
      const ux = anchor?.type === "text" ? anchor.x : p;
      const uy = anchor?.type === "text" ? anchor.y + anchor.height + 4 : p + Math.round(h * 0.14);
      const uw = anchor?.type === "text" ? anchor.width : Math.round(w * 0.4);
      layer = baseLayer(state, "underline", "Podtržení", ux, uy, uw, 4, {
        underlineColor: state.accentColor,
        thickness: 3,
        drawDurationMs: 650,
      });
      break;
    }
    case "particle":
      layer = baseLayer(state, "particle", "Částice", 0, 0, w, h, {
        particleMode: "floating-dots",
        particleCount: 20,
        colors: [state.accentColor, "#60a5fa"],
        speed: 1,
        particleLoop: true,
        opacity: 0.85,
      });
      break;
    case "shape":
    default:
      layer = baseLayer(
        state,
        "shape",
        "Tvar",
        Math.round(w * 0.35),
        Math.round(h * 0.35),
        Math.round(w * 0.3),
        Math.round(h * 0.2),
        {
          shapeType: "rectangle",
          fill: `${state.accentColor}33`,
          borderRadius: 8,
        },
      );
      break;
  }

  const { state: next, layer: created } = finalizeQuickLayer(state, layer, startMs);
  return { state: next, layer: created };
}
