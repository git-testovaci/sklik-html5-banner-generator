import type { BannerLayer } from "@/types/animation";
import type { BannerEditorState, SelectedLayer } from "@/types/editor";
import { layoutPhaseEffectsOnLayer } from "@/lib/animation/layer-phase-utils";
import {
  getEffectsForScene,
  getLayerById,
  getLayersForScene,
  getSceneById,
  syncFlatFromActiveScene,
  updateBannerLayer,
} from "@/lib/animation/storyboard-utils";

export const MIN_LAYER_DURATION_MS = 100;
export const DEFAULT_LAYER_INSERT_DURATION_MS = 3000;

export interface LayerTimelineRange {
  startMs: number;
  durationMs: number;
  /** True when derived from layerEffects rather than layer fields / full scene */
  fromEffects: boolean;
}

const LEGACY_LABELS: Record<string, string> = {
  headline: "Nadpis",
  subheadline: "Podnadpis",
  cta: "Výzva k akci",
  logo: "Logo",
  product: "Produkt",
  background: "Pozadí",
};

export function clampTimelineRange(
  startMs: number,
  durationMs: number,
  sceneDurationMs: number,
): LayerTimelineRange {
  const maxDur = Math.max(MIN_LAYER_DURATION_MS, sceneDurationMs);
  const dur = Math.max(MIN_LAYER_DURATION_MS, Math.min(durationMs, maxDur));
  const start = Math.max(0, Math.min(startMs, sceneDurationMs - MIN_LAYER_DURATION_MS));
  const clampedDur =
    start + dur > sceneDurationMs
      ? Math.max(MIN_LAYER_DURATION_MS, sceneDurationMs - start)
      : dur;
  return { startMs: start, durationMs: clampedDur, fromEffects: false };
}

export function getLayerTimelineRange(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
): LayerTimelineRange {
  const scene = getSceneById(state, sceneId);
  const layer = getLayerById(state, layerId);
  if (!scene || !layer) {
    return { startMs: 0, durationMs: scene?.durationMs ?? 3000, fromEffects: false };
  }

  const effects = getEffectsForScene(state, sceneId).filter((e) => e.layerId === layerId);
  if (effects.length > 0) {
    const startMs = Math.min(...effects.map((e) => e.startMs));
    const endMs = Math.max(...effects.map((e) => e.startMs + e.durationMs));
    return {
      startMs,
      durationMs: Math.max(MIN_LAYER_DURATION_MS, endMs - startMs),
      fromEffects: true,
    };
  }

  if (layer.timelineStartMs !== undefined && layer.timelineDurationMs !== undefined) {
    return clampTimelineRange(
      layer.timelineStartMs,
      layer.timelineDurationMs,
      scene.durationMs,
    );
  }

  return { startMs: 0, durationMs: scene.durationMs, fromEffects: false };
}

export function isLayerVisibleAtTimelineTime(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
  timeMs: number,
): boolean {
  const range = getLayerTimelineRange(state, sceneId, layerId);
  return timeMs >= range.startMs && timeMs < range.startMs + range.durationMs;
}

/** Update layer timing — shifts/scales layerEffects or stores on BannerLayer. */
export function updateLayerTimelineRange(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
  startMs: number,
  durationMs: number,
): BannerEditorState {
  const scene = getSceneById(state, sceneId);
  if (!scene) return state;

  const clamped = clampTimelineRange(startMs, durationMs, scene.durationMs);
  const layerEffects = (state.layerEffects ?? []).filter(
    (e) => e.sceneId === sceneId && e.layerId === layerId,
  );

  if (layerEffects.length > 0) {
    const current = getLayerTimelineRange(state, sceneId, layerId);
    const oldStart = current.startMs;
    const oldDuration = Math.max(MIN_LAYER_DURATION_MS, current.durationMs);

    const nextEffects = (state.layerEffects ?? []).map((e) => {
      if (e.sceneId !== sceneId || e.layerId !== layerId) return e;
      const relStart = (e.startMs - oldStart) / oldDuration;
      const relDur = e.durationMs / oldDuration;
      const nextStart = Math.round(clamped.startMs + relStart * clamped.durationMs);
      const nextDur = Math.max(
        MIN_LAYER_DURATION_MS,
        Math.round(relDur * clamped.durationMs),
      );
      const bounded = clampTimelineRange(nextStart, nextDur, scene.durationMs);
      return { ...e, startMs: bounded.startMs, durationMs: bounded.durationMs };
    });

    return layoutPhaseEffectsOnLayer(
      syncFlatFromActiveScene({ ...state, layerEffects: nextEffects }),
      sceneId,
      layerId,
    );
  }

  const withLayer = syncFlatFromActiveScene(
    updateBannerLayer(state, layerId, {
      timelineStartMs: clamped.startMs,
      timelineDurationMs: clamped.durationMs,
    }),
  );
  return layoutPhaseEffectsOnLayer(withLayer, sceneId, layerId);
}

export function defaultInsertDurationMs(
  sceneDurationMs: number,
  startMs: number,
): number {
  const remaining = Math.max(0, sceneDurationMs - startMs);
  if (remaining <= MIN_LAYER_DURATION_MS) return MIN_LAYER_DURATION_MS;
  return Math.max(
    MIN_LAYER_DURATION_MS,
    Math.min(DEFAULT_LAYER_INSERT_DURATION_MS, remaining),
  );
}

export function layerTimelineLabel(layer: BannerLayer): string {
  if (layer.legacyKey && LEGACY_LABELS[layer.legacyKey]) {
    return LEGACY_LABELS[layer.legacyKey]!;
  }
  if (layer.slotLabel) return layer.slotLabel;
  switch (layer.type) {
    case "text":
      return layer.name || "Text";
    case "image":
      return layer.name || "Obrázek";
    case "badge":
      return layer.isTemplateSlot || layer.slotKind ? layer.name || "Slot" : "Odznak";
    case "shape":
      return "Tvar";
    case "particle":
      return "Částice";
    case "underline":
      return "Podtržení";
    default:
      return layer.name;
  }
}

export function layerTimelineBlockColor(layer: BannerLayer): string {
  if (layer.type === "text") return "bg-violet-500/80 border-violet-400/60";
  if (layer.type === "image") return "bg-sky-500/80 border-sky-400/60";
  if (layer.type === "badge") {
    return layer.isTemplateSlot || layer.slotKind
      ? "bg-amber-500/70 border-amber-400/50"
      : "bg-orange-500/80 border-orange-400/60";
  }
  if (layer.type === "particle" || layer.type === "underline") {
    return "bg-fuchsia-500/70 border-fuchsia-400/50";
  }
  return "bg-zinc-500/70 border-zinc-400/50";
}

export function selectionForBannerLayer(layer: BannerLayer): SelectedLayer {
  if (
    layer.type === "text" &&
    (layer.legacyKey === "headline" ||
      layer.legacyKey === "subheadline" ||
      layer.legacyKey === "cta")
  ) {
    return { type: "text", id: layer.legacyKey };
  }
  return { type: "asset", id: layer.id };
}

export function isTimelineLayerSelected(
  selected: SelectedLayer,
  layer: BannerLayer,
): boolean {
  const target = selectionForBannerLayer(layer);
  return selected.type === target.type && selected.id === target.id;
}

/** Renderable scene layers sorted front-first (same order for timeline + layer panel). */
export function getOrderedSceneLayersForUi(
  state: BannerEditorState,
  sceneId: string,
): BannerLayer[] {
  const scene = getSceneById(state, sceneId);
  if (!scene) return [];

  const byId = new Map(
    getLayersForScene(state, sceneId)
      .filter(
        (l) =>
          l.type === "text" ||
          l.type === "image" ||
          l.type === "badge" ||
          l.type === "shape" ||
          l.type === "particle" ||
          l.type === "underline",
      )
      .map((l) => [l.id, l]),
  );

  const ordered: BannerLayer[] = [];
  for (const id of scene.layerIds) {
    const layer = byId.get(id);
    if (layer) {
      ordered.push(layer);
      byId.delete(id);
    }
  }
  for (const layer of byId.values()) {
    ordered.push(layer);
  }

  return [...ordered].sort((a, b) => b.zIndex - a.zIndex);
}

export function getTimelineLayersForScene(
  state: BannerEditorState,
  sceneId: string,
): BannerLayer[] {
  return getOrderedSceneLayersForUi(state, sceneId);
}

export function formatTimelineSeconds(ms: number): string {
  const s = ms / 1000;
  return s >= 10 ? `${s.toFixed(1)} s` : `${s.toFixed(2)} s`;
}
