import type { BannerLayer, LayerEffect } from "@/types/animation";
import type { BannerEditorState, SelectedLayer } from "@/types/editor";
import { resolveBannerLayerForSelection } from "@/lib/animation/selection-utils";
import { layoutPhaseEffectsOnLayer } from "@/lib/animation/layer-phase-utils";
import {
  clampTimelineRange,
  MIN_LAYER_DURATION_MS,
} from "@/lib/animation/layer-timeline-utils";

function newEffectId(): string {
  return `effect-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function clampEffectToSceneAndLayer(
  effect: LayerEffect,
  sceneDurationMs: number,
  layer: BannerLayer | undefined,
): LayerEffect {
  let startMs = Math.max(0, effect.startMs);
  let durationMs = Math.max(MIN_LAYER_DURATION_MS, effect.durationMs);

  const sceneMax = Math.max(MIN_LAYER_DURATION_MS, sceneDurationMs);
  startMs = Math.min(startMs, sceneMax - MIN_LAYER_DURATION_MS);
  durationMs = Math.min(durationMs, sceneMax - startMs);

  if (layer?.timelineStartMs !== undefined && layer.timelineDurationMs !== undefined) {
    const layerStart = layer.timelineStartMs;
    const layerEnd = layerStart + layer.timelineDurationMs;
    startMs = Math.max(startMs, layerStart);
    if (startMs + durationMs > layerEnd) {
      durationMs = Math.max(MIN_LAYER_DURATION_MS, layerEnd - startMs);
    }
  }

  return { ...effect, startMs, durationMs };
}

/** Non-destructive repair of storyboard editor invariants. */
export function repairEditorInvariants(state: BannerEditorState): BannerEditorState {
  const scenes = state.scenes ?? [];
  if (scenes.length === 0) return state;

  const sceneIds = new Set(scenes.map((s) => s.id));
  let activeSceneId = state.activeSceneId ?? scenes[0]!.id;
  if (!sceneIds.has(activeSceneId)) {
    activeSceneId = scenes[0]!.id;
  }

  const seenLayerIds = new Set<string>();
  const bannerLayers: BannerLayer[] = [];
  for (const layer of state.bannerLayers ?? []) {
    if (seenLayerIds.has(layer.id)) continue;
    if (layer.sceneId && !sceneIds.has(layer.sceneId) && !layer.persistent) {
      continue;
    }
    seenLayerIds.add(layer.id);
    bannerLayers.push(layer);
  }

  const layerById = new Map(bannerLayers.map((l) => [l.id, l]));

  const fixedScenes = scenes.map((scene) => {
    const ids = [...new Set(scene.layerIds.filter((id) => layerById.has(id)))];
    for (const layer of bannerLayers) {
      if (!layer.persistent && layer.sceneId === scene.id && !ids.includes(layer.id)) {
        ids.push(layer.id);
      }
    }
    return { ...scene, layerIds: ids };
  });

  const sceneById = new Map(fixedScenes.map((s) => [s.id, s]));

  const clampedLayers = bannerLayers.map((layer) => {
    if (layer.persistent) return layer;
    const scene =
      (layer.sceneId ? sceneById.get(layer.sceneId) : undefined) ??
      sceneById.get(activeSceneId);
    if (!scene) return layer;

    const start = layer.timelineStartMs ?? 0;
    const dur = layer.timelineDurationMs ?? scene.durationMs;
    const range = clampTimelineRange(start, dur, scene.durationMs);
    if (range.startMs === start && range.durationMs === dur) return layer;
    return {
      ...layer,
      timelineStartMs: range.startMs,
      timelineDurationMs: range.durationMs,
    };
  });

  const clampedById = new Map(clampedLayers.map((l) => [l.id, l]));
  const seenEffectIds = new Set<string>();

  const layerEffects = (state.layerEffects ?? [])
    .filter((e) => layerById.has(e.layerId) && sceneIds.has(e.sceneId))
    .map((e) => {
      let id = e.id;
      if (seenEffectIds.has(id)) id = newEffectId();
      seenEffectIds.add(id);

      const scene = sceneById.get(e.sceneId);
      if (!scene) return { ...e, id };
      const layer = clampedById.get(e.layerId);
      return clampEffectToSceneAndLayer({ ...e, id }, scene.durationMs, layer);
    });

  const layerKeyframes = (state.layerKeyframes ?? []).filter(
    (k) => layerById.has(k.layerId) && sceneIds.has(k.sceneId),
  );

  let next: BannerEditorState = {
    ...state,
    scenes: fixedScenes,
    bannerLayers: clampedLayers,
    layerEffects,
    layerKeyframes,
    activeSceneId,
  };

  const layersWithEffects = new Set<string>();
  for (const e of layerEffects) {
    layersWithEffects.add(`${e.sceneId}:${e.layerId}`);
  }
  for (const key of layersWithEffects) {
    const [sceneId, layerId] = key.split(":");
    if (sceneId && layerId) {
      next = layoutPhaseEffectsOnLayer(next, sceneId, layerId);
    }
  }

  return next;
}

/** True when selection resolves to an existing layer. */
export function isSelectionResolvable(
  state: BannerEditorState,
  selected: { type: string; id: string },
): boolean {
  if (selected.type === "asset" && selected.id === "__none__") return false;
  return resolveBannerLayerForSelection(state, selected as SelectedLayer) != null;
}
