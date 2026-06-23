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

export const TIMELINE_ZOOM_LEVELS = [1, 1.5, 2, 3] as const;
export type TimelineZoomLevel = (typeof TIMELINE_ZOOM_LEVELS)[number];

export const TIMELINE_TRACK_BASE_WIDTH_PX = 360;
export const TIMELINE_LABEL_WIDTH_PX = 140;
export const TIMELINE_ROW_HEIGHT_PX = 42;
export const TIMELINE_RULER_HEIGHT_PX = 32;

export function cycleTimelineZoom(
  current: TimelineZoomLevel,
  direction: "in" | "out",
): TimelineZoomLevel {
  const idx = TIMELINE_ZOOM_LEVELS.indexOf(current);
  const i = idx >= 0 ? idx : 0;
  if (direction === "in") {
    return TIMELINE_ZOOM_LEVELS[Math.min(TIMELINE_ZOOM_LEVELS.length - 1, i + 1)] ?? current;
  }
  return TIMELINE_ZOOM_LEVELS[Math.max(0, i - 1)] ?? current;
}

export function timelineTrackWidthPx(zoom: TimelineZoomLevel): number {
  return Math.round(TIMELINE_TRACK_BASE_WIDTH_PX * zoom);
}

/** Ruler tick positions (ms) scaled for scene duration and zoom level. */
export function buildRulerTicks(sceneDurationMs: number, zoom = 1): number[] {
  let step =
    sceneDurationMs <= 2000
      ? 250
      : sceneDurationMs <= 4000
        ? 500
        : sceneDurationMs <= 8000
          ? 1000
          : sceneDurationMs <= 20000
            ? 2000
            : 5000;
  if (zoom >= 1.5) step = Math.max(100, Math.round(step / 1.5));
  if (zoom >= 2) step = Math.max(100, Math.round(step / 2));
  if (zoom >= 3) step = Math.max(50, Math.round(step / 2));

  const ticks: number[] = [];
  for (let t = 0; t <= sceneDurationMs; t += step) {
    ticks.push(t);
  }
  if (ticks.length === 0 || ticks[ticks.length - 1] !== sceneDurationMs) {
    ticks.push(sceneDurationMs);
  }
  return ticks;
}

export function layerTimelineTypeGlyph(layer: BannerLayer): string {
  if (layer.type === "text") return "T";
  if (layer.type === "image") return "▣";
  if (layer.type === "badge") {
    return layer.isTemplateSlot || layer.slotKind ? "◇" : "◆";
  }
  if (layer.type === "shape") return "□";
  if (layer.type === "particle") return "✦";
  if (layer.type === "underline") return "—";
  return "•";
}

export function layerBlockTooltip(
  layer: BannerLayer,
  range: { startMs: number; durationMs: number },
): string {
  const endMs = range.startMs + range.durationMs;
  const flags = [
    !layer.visible ? "skryté" : null,
    layer.locked ? "zamknuté" : null,
  ]
    .filter(Boolean)
    .join(", ");
  const suffix = flags ? ` · ${flags}` : "";
  return `${layerTimelineLabel(layer)} · ${formatTimelineSeconds(range.startMs)} – ${formatTimelineSeconds(endMs)} · délka ${formatTimelineSeconds(range.durationMs)}${suffix}`;
}

export function nudgeLayerTimelineStart(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
  deltaMs: number,
): BannerEditorState {
  const scene = getSceneById(state, sceneId);
  if (!scene) return state;
  const range = getLayerTimelineRange(state, sceneId, layerId);
  const newStart = Math.max(
    0,
    Math.min(range.startMs + deltaMs, scene.durationMs - range.durationMs),
  );
  return updateLayerTimelineRange(state, sceneId, layerId, newStart, range.durationMs);
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}
