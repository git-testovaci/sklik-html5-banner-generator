import type {
  AnimationPreset,
  BannerLayer,
  BannerScene,
  BannerSceneTransition,
  EffectPreset,
  LayerAnimation,
  LayerEffect,
  LayerKeyframe,
} from "@/types/animation";
import type { BannerAssetPlacement, TextLayerPlacement } from "@/types/assets";
import type { BannerEditorState, SelectedLayer } from "@/types/editor";
import type { BannerProject } from "@/types/project";
import { repairEditorInvariants } from "@/lib/editor/editor-invariants";
import { effectPresetDefaults } from "./effect-presets";
import { buildPhaseLayerAnimationsForScene } from "./layer-phase-utils";
import {
  frontZIndexForScene,
  getLayerTimelineRange,
  updateLayerTimelineRange,
} from "./layer-timeline-utils";
import { nextDuplicateLayerName } from "./layer-instance-utils";

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultScene(name = "Scene 1", durationMs = 3000): BannerScene {
  const now = new Date().toISOString();
  return {
    id: newId("scene"),
    name,
    durationMs,
    transitionIn: "none",
    transitionOut: "fade",
    transitionDurationMs: DEFAULT_SCENE_TRANSITION_MS,
    layerIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const DEFAULT_SCENE_TRANSITION_MS = 700;
export const MIN_SCENE_TRANSITION_MS = 250;
export const MAX_SCENE_TRANSITION_MS = 1200;

export function clampSceneTransitionDurationMs(scene: BannerScene): number {
  const raw = scene.transitionDurationMs ?? DEFAULT_SCENE_TRANSITION_MS;
  const maxForScene = Math.min(MAX_SCENE_TRANSITION_MS, Math.floor(scene.durationMs / 2));
  return Math.max(MIN_SCENE_TRANSITION_MS, Math.min(raw, maxForScene));
}

export function getSceneTransitionDurationMs(scene: BannerScene): number {
  return clampSceneTransitionDurationMs(scene);
}

/** Clamp transition ms from duration + optional stored value (export/preview CSS). */
export function transitionDurationForScene(
  sceneDurationMs: number,
  transitionDurationMs?: number,
): number {
  return clampSceneTransitionDurationMs({
    id: "_",
    name: "_",
    durationMs: sceneDurationMs,
    transitionIn: "none",
    transitionOut: "fade",
    transitionDurationMs,
    layerIds: [],
    createdAt: "",
    updatedAt: "",
  });
}

export function getActiveScene(state: BannerEditorState): BannerScene | undefined {
  const scenes = state.scenes ?? [];
  if (scenes.length === 0) return undefined;
  const id = state.activeSceneId ?? scenes[0]?.id;
  return scenes.find((s) => s.id === id) ?? scenes[0];
}

export function getSceneById(state: BannerEditorState, sceneId: string): BannerScene | undefined {
  return (state.scenes ?? []).find((s) => s.id === sceneId);
}

export function getLayerById(state: BannerEditorState, layerId: string): BannerLayer | undefined {
  return (state.bannerLayers ?? []).find((l) => l.id === layerId);
}

export function getLayersForScene(state: BannerEditorState, sceneId: string): BannerLayer[] {
  const scene = getSceneById(state, sceneId);
  if (!scene) return [];
  const ids = new Set(scene.layerIds);
  return (state.bannerLayers ?? []).filter(
    (l) => l.persistent || ids.has(l.id),
  );
}

export function getEffectsForScene(state: BannerEditorState, sceneId: string): LayerEffect[] {
  return (state.layerEffects ?? []).filter((e) => e.sceneId === sceneId);
}

export function getKeyframesForScene(state: BannerEditorState, sceneId: string): LayerKeyframe[] {
  return (state.layerKeyframes ?? []).filter((k) => k.sceneId === sceneId);
}

/** Export / storyboard total duration. Editor playback prefers totalBannerDurationMs. */
export function totalStoryboardDurationMs(state: BannerEditorState): number {
  return (state.scenes ?? []).reduce((sum, s) => sum + s.durationMs, 0);
}

export function sceneStartOffsetMs(state: BannerEditorState, sceneId: string): number {
  let offset = 0;
  for (const scene of state.scenes ?? []) {
    if (scene.id === sceneId) return offset;
    offset += scene.durationMs;
  }
  return offset;
}

export function textLayerFromPlacement(
  pl: TextLayerPlacement,
  state: BannerEditorState,
  sceneId: string,
  persistent = false,
): BannerLayer {
  const textMap: Record<TextLayerPlacement["layerId"], string> = {
    headline: state.headline,
    subheadline: state.subheadline,
    cta: state.cta,
  };
  const color =
    pl.layerId === "cta" ? state.ctaTextColor : state.textColor;
  return {
    id: pl.layerId,
    sceneId: persistent ? undefined : sceneId,
    persistent,
    name: pl.layerId.charAt(0).toUpperCase() + pl.layerId.slice(1),
    type: "text",
    visible: pl.visible,
    locked: false,
    x: pl.x,
    y: pl.y,
    width: pl.width,
    height: pl.height,
    opacity: pl.opacity,
    rotation: pl.rotation,
    scale: 1,
    zIndex: pl.zIndex,
    text: textMap[pl.layerId],
    fontSize: pl.fontSize,
    fontWeight: pl.fontWeight,
    lineHeight: pl.lineHeight,
    textAlign: pl.textAlign,
    color,
    legacyKey: pl.layerId,
  };
}

export function imageLayerFromPlacement(
  pl: BannerAssetPlacement,
  sceneId: string,
  persistent = false,
): BannerLayer {
  const nameMap: Record<BannerAssetPlacement["kind"], string> = {
    logo: "Logo",
    product: "Product",
    background: "Background",
    decoration: "Decoration",
  };
  return {
    id: pl.assetId,
    sceneId: persistent ? undefined : sceneId,
    persistent,
    name: nameMap[pl.kind],
    type: pl.kind === "decoration" ? "badge" : "image",
    visible: pl.visible,
    locked: false,
    x: pl.x,
    y: pl.y,
    width: pl.width,
    height: pl.height,
    opacity: pl.opacity,
    rotation: pl.rotation,
    scale: 1,
    zIndex: pl.zIndex,
    assetId: pl.assetId,
    fit: pl.fit,
    borderRadius: pl.borderRadius,
    shadow: pl.shadow,
    legacyKey: pl.kind === "decoration" ? `decoration-${pl.assetId}` : pl.kind,
  };
}

export function layerEffectFromAnimation(
  anim: LayerAnimation,
  sceneId: string,
): LayerEffect {
  const preset = animationPresetToEffect(anim.preset);
  return {
    id: newId("effect"),
    layerId: anim.layerId,
    sceneId,
    preset,
    startMs: anim.startMs,
    durationMs: anim.durationMs,
    easing: anim.easing,
    direction: anim.direction,
    distancePx: anim.distancePx,
    intensity: 1,
    loop: anim.preset === "soft-pulse",
  };
}

function animationPresetToEffect(preset: AnimationPreset): EffectPreset {
  const map: Partial<Record<AnimationPreset, EffectPreset>> = {
    "fade-in": "fade-in",
    "slide-in-left": "slide-in-left",
    "slide-in-right": "slide-in-right",
    "slide-up": "enter-from-top",
    "slide-down": "enter-from-bottom",
    "zoom-in": "zoom-in",
    "bounce-in": "bounce-in",
    "soft-pulse": "float-subtle",
  };
  return map[preset] ?? "fade-in";
}

export function migrateToStoryboard(state: BannerEditorState): BannerEditorState {
  if ((state.scenes ?? []).length > 0) {
    const scenes = state.scenes ?? [];
    let activeSceneId = state.activeSceneId ?? scenes[0]!.id;
    if (!scenes.some((s) => s.id === activeSceneId)) {
      activeSceneId = scenes[0]!.id;
    }
    if ((state.bannerLayers ?? []).length > 0) {
      return syncFlatFromActiveScene(repairEditorInvariants({ ...state, activeSceneId }));
    }
    const scene = getSceneById({ ...state, activeSceneId }, activeSceneId);
    if (!scene) {
      return syncFlatFromActiveScene(repairEditorInvariants({ ...state, activeSceneId }));
    }
    return syncFlatFromActiveScene(repairEditorInvariants(rebuildLayersFromFlat(state, scene)));
  }

  const scene = defaultScene("Scene 1", state.timeline?.durationMs ?? 3000);
  const layers: BannerLayer[] = [];
  const effects: LayerEffect[] = [];

  for (const pl of state.textPlacements ?? []) {
    const persistent = false;
    layers.push(textLayerFromPlacement(pl, state, scene.id, persistent));
  }

  for (const pl of state.assetPlacements ?? []) {
    const persistent = pl.kind === "logo";
    layers.push(imageLayerFromPlacement(pl, scene.id, persistent));
  }

  scene.layerIds = layers.filter((l) => !l.persistent).map((l) => l.id);

  for (const anim of state.layerAnimations ?? []) {
    if (!anim.enabled || anim.preset === "none") continue;
    effects.push(layerEffectFromAnimation(anim, scene.id));
  }

  const timedLayers = ensureDefaultLayerTimings(layers, scene.durationMs);

  return syncFlatFromActiveScene(
    repairEditorInvariants({
      ...state,
      scenes: [scene],
      bannerLayers: timedLayers,
      layerEffects: effects,
      layerKeyframes: state.layerKeyframes ?? [],
      activeSceneId: scene.id,
    }),
  );
}

function ensureDefaultLayerTimings(
  layers: BannerLayer[],
  sceneDurationMs: number,
): BannerLayer[] {
  return layers.map((layer) => {
    if (layer.timelineStartMs !== undefined && layer.timelineDurationMs !== undefined) {
      return layer;
    }
    let startMs = 0;
    if (layer.legacyKey === "subheadline") startMs = 250;
    else if (layer.legacyKey === "cta") startMs = Math.round(sceneDurationMs * 0.55);
    else if (layer.legacyKey === "product") startMs = 400;
    const durationMs = Math.max(100, sceneDurationMs - startMs);
    return { ...layer, timelineStartMs: startMs, timelineDurationMs: durationMs };
  });
}

function rebuildLayersFromFlat(
  state: BannerEditorState,
  scene: BannerScene,
): BannerEditorState {
  const layers: BannerLayer[] = [];
  const effects: LayerEffect[] = [];

  for (const pl of state.textPlacements ?? []) {
    layers.push(textLayerFromPlacement(pl, state, scene.id, false));
  }
  for (const pl of state.assetPlacements ?? []) {
    layers.push(imageLayerFromPlacement(pl, scene.id, pl.kind === "logo"));
  }

  const nextScene: BannerScene = {
    ...scene,
    layerIds: layers.filter((l) => !l.persistent).map((l) => l.id),
  };

  for (const anim of state.layerAnimations ?? []) {
    if (!anim.enabled || anim.preset === "none") continue;
    effects.push(layerEffectFromAnimation(anim, scene.id));
  }

  return {
    ...state,
    scenes: (state.scenes ?? []).map((s) => (s.id === scene.id ? nextScene : s)),
    bannerLayers: layers,
    layerEffects: effects.length > 0 ? effects : state.layerEffects ?? [],
    activeSceneId: scene.id,
  };
}

/** Flat editor slice for a specific scene — used by preview/export consistency */
export function buildFlatSliceForScene(
  state: BannerEditorState,
  sceneId: string,
): Pick<
  BannerEditorState,
  | "headline"
  | "subheadline"
  | "cta"
  | "textPlacements"
  | "assetPlacements"
  | "layerAnimations"
  | "timeline"
> {
  const scene = getSceneById(state, sceneId);
  if (!scene) {
    return {
      headline: state.headline,
      subheadline: state.subheadline,
      cta: state.cta,
      textPlacements: state.textPlacements ?? [],
      assetPlacements: state.assetPlacements ?? [],
      layerAnimations: state.layerAnimations ?? [],
      timeline: state.timeline,
    };
  }

  const sceneLayers = getLayersForScene(state, sceneId);
  const textPlacements: TextLayerPlacement[] = [];
  const assetPlacements: BannerAssetPlacement[] = [];

  for (const layer of sceneLayers) {
    if (layer.type === "text" && layer.legacyKey) {
      textPlacements.push({
        layerId: layer.legacyKey as TextLayerPlacement["layerId"],
        visible: layer.visible,
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        opacity: layer.opacity,
        rotation: layer.rotation,
        zIndex: layer.zIndex,
        fontSize: layer.fontSize,
        fontWeight: layer.fontWeight,
        lineHeight: layer.lineHeight,
        textAlign: layer.textAlign,
      });
    } else if ((layer.type === "image" || layer.type === "badge") && layer.assetId) {
      const kind =
        layer.legacyKey === "logo" ||
        layer.legacyKey === "product" ||
        layer.legacyKey === "background"
          ? layer.legacyKey
          : "decoration";
      assetPlacements.push({
        assetId: layer.assetId,
        bannerLayerId: layer.id,
        kind: kind as BannerAssetPlacement["kind"],
        visible: layer.visible,
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
        opacity: layer.opacity,
        rotation: layer.rotation,
        zIndex: layer.zIndex,
        fit: layer.fit ?? "contain",
        borderRadius: layer.borderRadius ?? 0,
        shadow: layer.shadow ?? false,
      });
    }
  }

  const layerAnimations = buildPhaseLayerAnimationsForScene(state, sceneId);

  return {
    headline: sceneLayers.find((l) => l.legacyKey === "headline")?.text ?? state.headline,
    subheadline:
      sceneLayers.find((l) => l.legacyKey === "subheadline")?.text ?? state.subheadline,
    cta: sceneLayers.find((l) => l.legacyKey === "cta")?.text ?? state.cta,
    textPlacements,
    assetPlacements,
    layerAnimations,
    timeline: {
      durationMs: scene.durationMs,
      loop: state.timeline?.loop ?? false,
      backgroundAnimation: state.timeline?.backgroundAnimation ?? "none",
    },
  };
}

export function syncFlatFromActiveScene(state: BannerEditorState): BannerEditorState {
  const scene = getActiveScene(state);
  if (!scene) return state;

  const slice = buildFlatSliceForScene(state, scene.id);
  return { ...state, ...slice };
}

export function updateBannerLayer(
  state: BannerEditorState,
  layerId: string,
  patch: Partial<BannerLayer>,
): BannerEditorState {
  const next = {
    ...state,
    bannerLayers: (state.bannerLayers ?? []).map((l) =>
      l.id === layerId ? { ...l, ...patch } : l,
    ),
  };
  return syncFlatFromActiveScene(next);
}

/** Flat editor patch after updating a banner layer (keeps legacy CTA/headline fields in sync). */
export function patchBannerLayerSlice(
  state: BannerEditorState,
  layerId: string,
  patch: Partial<BannerLayer>,
): Partial<BannerEditorState> {
  const layer = getLayerById(state, layerId);
  const next = updateBannerLayer(state, layerId, patch);
  const slice: Partial<BannerEditorState> = {
    bannerLayers: next.bannerLayers,
    textPlacements: next.textPlacements,
    assetPlacements: next.assetPlacements,
    headline: next.headline,
    subheadline: next.subheadline,
    cta: next.cta,
    layerAnimations: next.layerAnimations,
    timeline: next.timeline,
  };
  if (layer?.legacyKey === "cta") {
    if (patch.text !== undefined) slice.cta = patch.text;
    if (patch.fill !== undefined) slice.ctaBackgroundColor = patch.fill;
    if (patch.color !== undefined) slice.ctaTextColor = patch.color;
  }
  return slice;
}

export type LayerReorderAction = "forward" | "backward" | "front" | "back";

export function reorderLayerInScene(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
  action: LayerReorderAction,
): BannerEditorState {
  const layer = getLayerById(state, layerId);
  if (!layer) return state;

  const sceneLayers = getLayersForScene(state, sceneId).filter(
    (l) =>
      l.type === "text" ||
      l.type === "image" ||
      l.type === "badge" ||
      l.type === "shape" ||
      l.type === "particle" ||
      l.type === "underline",
  );
  if (sceneLayers.length < 2) return state;

  const sorted = [...sceneLayers].sort((a, b) => a.zIndex - b.zIndex);
  const idx = sorted.findIndex((l) => l.id === layerId);
  if (idx === -1) return state;

  let targetIdx = idx;
  if (action === "forward") targetIdx = idx + 1;
  else if (action === "backward") targetIdx = idx - 1;
  else if (action === "front") targetIdx = sorted.length - 1;
  else if (action === "back") targetIdx = 0;
  targetIdx = Math.max(0, Math.min(sorted.length - 1, targetIdx));
  if (targetIdx === idx) return state;

  const reordered = [...sorted];
  const [moved] = reordered.splice(idx, 1);
  reordered.splice(targetIdx, 0, moved!);

  const zById = new Map<string, number>();
  reordered.forEach((l, i) => zById.set(l.id, 10 + i * 2));

  const scene = getSceneById(state, sceneId);
  if (!scene) return state;

  const reorderableIds = new Set(reordered.map((l) => l.id));
  const staticIds = scene.layerIds.filter((id) => !reorderableIds.has(id));
  const newLayerIds = [...staticIds, ...reordered.map((l) => l.id)];

  const next = syncFlatFromActiveScene({
    ...state,
    bannerLayers: (state.bannerLayers ?? []).map((l) =>
      zById.has(l.id) ? { ...l, zIndex: zById.get(l.id)! } : l,
    ),
    scenes: (state.scenes ?? []).map((s) =>
      s.id === sceneId
        ? { ...s, layerIds: newLayerIds, updatedAt: new Date().toISOString() }
        : s,
    ),
  });
  return next;
}

export function clearLayerAsset(
  state: BannerEditorState,
  layerId: string,
): BannerEditorState {
  const layer = getLayerById(state, layerId);
  if (!layer) return state;
  const patch: Partial<BannerLayer> = { assetId: undefined };
  if (layer.isTemplateSlot || layer.slotKind) {
    patch.type = "badge";
  }
  return updateBannerLayer(state, layerId, patch);
}

export function removeLayerFromEditor(
  state: BannerEditorState,
  layerId: string,
): BannerEditorState {
  const layer = getLayerById(state, layerId);
  if (!layer) return state;

  const isTimelineMedia =
    layer.type === "image" &&
    !!layer.assetId &&
    !layer.isTemplateSlot &&
    !layer.slotKind &&
    !layer.legacyKey;

  if (isTimelineMedia) {
    return deleteBannerLayer(state, layerId);
  }

  if ((layer.isTemplateSlot || layer.slotKind) && layer.assetId) {
    return clearLayerAsset(state, layerId);
  }
  if (
    layer.legacyKey === "headline" ||
    layer.legacyKey === "subheadline" ||
    layer.legacyKey === "cta"
  ) {
    return updateBannerLayer(state, layerId, { visible: false });
  }
  if (layer.isTemplateSlot || layer.slotKind) {
    return updateBannerLayer(state, layerId, { visible: false });
  }
  if (layer.persistent) return state;
  return deleteBannerLayer(state, layerId);
}

export function addScene(state: BannerEditorState, name?: string): BannerEditorState {
  const scenes = [...(state.scenes ?? [])];
  const scene = defaultScene(name ?? `Scene ${scenes.length + 1}`, 3000);
  const persistentIds = (state.bannerLayers ?? []).filter((l) => l.persistent).map((l) => l.id);
  scene.layerIds = [...persistentIds];
  scenes.push(scene);
  return syncFlatFromActiveScene({
    ...state,
    scenes,
    activeSceneId: scene.id,
  });
}

export function duplicateScene(state: BannerEditorState, sceneId: string): BannerEditorState {
  const source = getSceneById(state, sceneId);
  if (!source) return state;
  const now = new Date().toISOString();
  const newScene: BannerScene = {
    ...source,
    id: newId("scene"),
    name: `${source.name} copy`,
    layerIds: [],
    createdAt: now,
    updatedAt: now,
  };

  const newLayers: BannerLayer[] = [];
  const newEffects: LayerEffect[] = [];
  const idMap = new Map<string, string>();

  for (const lid of source.layerIds) {
    const layer = getLayerById(state, lid);
    if (!layer || layer.persistent) continue;
    const newLayerId = newId("layer");
    idMap.set(lid, newLayerId);
    newLayers.push({ ...layer, id: newLayerId, sceneId: newScene.id });
    newScene.layerIds.push(newLayerId);
  }

  for (const effect of getEffectsForScene(state, sceneId)) {
    const mappedLayer = idMap.get(effect.layerId);
    if (!mappedLayer) continue;
    newEffects.push({
      ...effect,
      id: newId("effect"),
      layerId: mappedLayer,
      sceneId: newScene.id,
    });
  }

  return syncFlatFromActiveScene({
    ...state,
    scenes: [...(state.scenes ?? []), newScene],
    bannerLayers: [...(state.bannerLayers ?? []), ...newLayers],
    layerEffects: [...(state.layerEffects ?? []), ...newEffects],
    activeSceneId: newScene.id,
  });
}

export function deleteScene(state: BannerEditorState, sceneId: string): BannerEditorState {
  const scenes = state.scenes ?? [];
  if (scenes.length <= 1) return state;

  const idx = scenes.findIndex((s) => s.id === sceneId);
  if (idx < 0) return state;

  const removedIds = new Set(scenes[idx]!.layerIds);
  const nextScenes = scenes.filter((s) => s.id !== sceneId);
  const nextLayers = (state.bannerLayers ?? []).filter(
    (l) => l.persistent || !removedIds.has(l.id),
  );
  const nextEffects = (state.layerEffects ?? []).filter((e) => e.sceneId !== sceneId);
  const nextKeyframes = (state.layerKeyframes ?? []).filter((k) => k.sceneId !== sceneId);

  let activeSceneId = state.activeSceneId;
  if (activeSceneId === sceneId) {
    activeSceneId = nextScenes[Math.max(0, idx - 1)]?.id ?? nextScenes[0]?.id;
  }

  return syncFlatFromActiveScene({
    ...state,
    scenes: nextScenes,
    bannerLayers: nextLayers,
    layerEffects: nextEffects,
    layerKeyframes: nextKeyframes,
    activeSceneId,
  });
}

export function moveScene(
  state: BannerEditorState,
  sceneId: string,
  direction: "left" | "right",
): BannerEditorState {
  const scenes = [...(state.scenes ?? [])];
  const idx = scenes.findIndex((s) => s.id === sceneId);
  if (idx < 0) return state;
  const swap = direction === "left" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= scenes.length) return state;
  [scenes[idx], scenes[swap]] = [scenes[swap]!, scenes[idx]!];
  return { ...state, scenes };
}

export function setActiveScene(state: BannerEditorState, sceneId: string): BannerEditorState {
  if (!getSceneById(state, sceneId)) return state;
  return syncFlatFromActiveScene({ ...state, activeSceneId: sceneId });
}

export function updateScene(
  state: BannerEditorState,
  sceneId: string,
  patch: Partial<BannerScene>,
): BannerEditorState {
  const target = getSceneById(state, sceneId);
  let normalizedPatch = patch;
  if (target && patch.transitionDurationMs !== undefined) {
    normalizedPatch = {
      ...patch,
      transitionDurationMs: clampSceneTransitionDurationMs({
        ...target,
        transitionDurationMs: patch.transitionDurationMs,
      }),
    };
  }
  if (target && patch.durationMs !== undefined && target.transitionDurationMs !== undefined) {
    normalizedPatch = {
      ...normalizedPatch,
      transitionDurationMs: clampSceneTransitionDurationMs({
        ...target,
        durationMs: patch.durationMs,
        transitionDurationMs:
          normalizedPatch.transitionDurationMs ?? target.transitionDurationMs,
      }),
    };
  }
  const next = {
    ...state,
    scenes: (state.scenes ?? []).map((s) =>
      s.id === sceneId
        ? { ...s, ...normalizedPatch, updatedAt: new Date().toISOString() }
        : s,
    ),
  };
  if (patch.durationMs !== undefined) {
    const repaired = repairEditorInvariants(next);
    if (getActiveScene(state)?.id === sceneId) {
      return syncFlatFromActiveScene(repaired);
    }
    return repaired;
  }
  return next;
}

export function applyTransitionToAllScenes(
  state: BannerEditorState,
  transitionOut: BannerSceneTransition,
  transitionDurationMs?: number,
): BannerEditorState {
  const now = new Date().toISOString();
  return {
    ...state,
    scenes: (state.scenes ?? []).map((s) => {
      const dur =
        transitionDurationMs ??
        s.transitionDurationMs ??
        DEFAULT_SCENE_TRANSITION_MS;
      return {
        ...s,
        transitionOut,
        transitionDurationMs: clampSceneTransitionDurationMs({
          ...s,
          transitionDurationMs: dur,
        }),
        updatedAt: now,
      };
    }),
  };
}

export function addLayerToScene(
  state: BannerEditorState,
  layer: BannerLayer,
): BannerEditorState {
  const scene = getActiveScene(state);
  if (!scene) return state;
  const layers = [...(state.bannerLayers ?? []), { ...layer, sceneId: layer.persistent ? undefined : scene.id }];
  const scenes = (state.scenes ?? []).map((s) =>
    s.id === scene.id && !layer.persistent
      ? { ...s, layerIds: [...s.layerIds, layer.id], updatedAt: new Date().toISOString() }
      : s,
  );
  return syncFlatFromActiveScene({ ...state, bannerLayers: layers, scenes });
}

/** Keep bannerLayers registered on a scene — required for preview/layers list consistency. */
export function ensureLayerInScene(
  state: BannerEditorState,
  layerId: string,
  sceneId: string,
): BannerEditorState {
  const layer = getLayerById(state, layerId);
  if (!layer || layer.persistent) return state;
  const scene = getSceneById(state, sceneId);
  if (!scene || scene.layerIds.includes(layerId)) return state;
  return {
    ...state,
    scenes: (state.scenes ?? []).map((s) =>
      s.id === sceneId
        ? { ...s, layerIds: [...s.layerIds, layerId], updatedAt: new Date().toISOString() }
        : s,
    ),
  };
}

/** Scene-local playback time — shared by playback + animation story highlights. */
export function sceneLocalPlaybackTime(
  globalMs: number,
  scenes: BannerScene[],
  sceneId: string,
  playAllView: boolean,
): number {
  if (!playAllView) return Math.max(0, globalMs);
  let offset = 0;
  for (const scene of scenes) {
    if (scene.id === sceneId) return Math.max(0, globalMs - offset);
    offset += scene.durationMs;
  }
  return 0;
}

export {
  repairEditorSelection as resolveStoryboardSelection,
  resolveBannerLayerForSelection,
} from "@/lib/animation/selection-utils";

/** Duplicate one layer in the active scene — copies timing, effects, and media reference. */
export function duplicateBannerLayerInScene(
  state: BannerEditorState,
  sourceLayerId: string,
  offsetPx = 12,
): { state: BannerEditorState; layerId: string | null } {
  const scene = getActiveScene(state);
  const source = getLayerById(state, sourceLayerId);
  if (!scene || !source || source.persistent) {
    return { state, layerId: null };
  }

  const range = getLayerTimelineRange(state, scene.id, source.id);
  const newLayerId = newId("layer");
  const newLayer: BannerLayer = {
    ...source,
    id: newLayerId,
    name: nextDuplicateLayerName(state, scene.id, source),
    x: source.x + offsetPx,
    y: source.y + offsetPx,
    legacyKey: undefined,
    isTemplateSlot: undefined,
    slotKind: undefined,
    slotLabel: undefined,
    slotId: undefined,
    persistent: false,
    sceneId: scene.id,
    zIndex: frontZIndexForScene(state, scene.id),
    timelineStartMs: range.startMs,
    timelineDurationMs: range.durationMs,
  };

  const newEffects = getEffectsForScene(state, scene.id)
    .filter((e) => e.layerId === source.id)
    .map((e) => ({
      ...e,
      id: newId("effect"),
      layerId: newLayerId,
      sceneId: scene.id,
    }));

  const newKeyframes = (state.layerKeyframes ?? [])
    .filter((k) => k.layerId === source.id && k.sceneId === scene.id)
    .map((k) => ({
      ...k,
      id: newId("kf"),
      layerId: newLayerId,
      sceneId: scene.id,
    }));

  let next = syncFlatFromActiveScene({
    ...state,
    bannerLayers: [...(state.bannerLayers ?? []), newLayer],
    layerEffects: [...(state.layerEffects ?? []), ...newEffects],
    layerKeyframes: [...(state.layerKeyframes ?? []), ...newKeyframes],
    scenes: (state.scenes ?? []).map((s) =>
      s.id === scene.id
        ? { ...s, layerIds: [...s.layerIds, newLayerId], updatedAt: new Date().toISOString() }
        : s,
    ),
  });

  next = updateLayerTimelineRange(
    next,
    scene.id,
    newLayerId,
    range.startMs,
    range.durationMs,
  );

  return { state: syncFlatFromActiveScene(repairEditorInvariants(next)), layerId: newLayerId };
}

export function deleteBannerLayer(
  state: BannerEditorState,
  layerId: string,
): BannerEditorState {
  const layer = getLayerById(state, layerId);
  if (!layer || layer.persistent) return state;
  const next = {
    ...state,
    bannerLayers: (state.bannerLayers ?? []).filter((l) => l.id !== layerId),
    layerEffects: (state.layerEffects ?? []).filter((e) => e.layerId !== layerId),
    layerKeyframes: (state.layerKeyframes ?? []).filter((k) => k.layerId !== layerId),
    assetPlacements: (state.assetPlacements ?? []).filter(
      (p) => p.bannerLayerId !== layerId,
    ),
    scenes: (state.scenes ?? []).map((s) => ({
      ...s,
      layerIds: s.layerIds.filter((id) => id !== layerId),
    })),
  };
  return syncFlatFromActiveScene(repairEditorInvariants(next));
}

export function addLayerEffect(
  state: BannerEditorState,
  layerId: string,
  preset: EffectPreset,
): BannerEditorState {
  const scene = getActiveScene(state);
  if (!scene) return state;
  const defaults = effectPresetDefaults(preset);
  const effect: LayerEffect = {
    id: newId("effect"),
    layerId,
    sceneId: scene.id,
    preset,
    startMs: defaults.startMs,
    durationMs: defaults.durationMs,
    easing: defaults.easing,
    direction: "normal",
    distancePx: defaults.distancePx,
    intensity: defaults.intensity,
    loop: defaults.loop,
  };
  const next = {
    ...state,
    layerEffects: [...(state.layerEffects ?? []), effect],
  };
  return syncFlatFromActiveScene(next);
}

export function updateLayerEffect(
  state: BannerEditorState,
  effectId: string,
  patch: Partial<LayerEffect>,
): BannerEditorState {
  const next = {
    ...state,
    layerEffects: (state.layerEffects ?? []).map((e) =>
      e.id === effectId ? { ...e, ...patch } : e,
    ),
  };
  return syncFlatFromActiveScene(next);
}

export function deleteLayerEffect(state: BannerEditorState, effectId: string): BannerEditorState {
  const next = {
    ...state,
    layerEffects: (state.layerEffects ?? []).filter((e) => e.id !== effectId),
  };
  return syncFlatFromActiveScene(next);
}

export function clearSelectedEffectIfMissing(
  state: BannerEditorState,
  selectedEffectId: string | null,
): string | null {
  if (!selectedEffectId) return null;
  const exists = (state.layerEffects ?? []).some((e) => e.id === selectedEffectId);
  return exists ? selectedEffectId : null;
}

export function addParticleLayer(state: BannerEditorState): BannerEditorState {
  const scene = getActiveScene(state);
  if (!scene) return state;
  const layer: BannerLayer = {
    id: newId("particle"),
    sceneId: scene.id,
    persistent: false,
    name: "Particles",
    type: "particle",
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: state.width,
    height: state.height,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: 50,
    particleMode: "dust-to-clean",
    particleCount: 24,
    colors: ["#fbbf24", "#a78bfa", "#60a5fa"],
    speed: 1,
    spread: 40,
    particleLoop: true,
  };
  return syncFlatFromActiveScene({
    ...state,
    bannerLayers: [...(state.bannerLayers ?? []), layer],
    scenes: (state.scenes ?? []).map((s) =>
      s.id === scene.id ? { ...s, layerIds: [...s.layerIds, layer.id] } : s,
    ),
  });
}

export function addUnderlineLayer(
  state: BannerEditorState,
  targetTextLayerId?: string,
): BannerEditorState {
  const scene = getActiveScene(state);
  if (!scene) return state;
  const target = targetTextLayerId
    ? getLayerById(state, targetTextLayerId)
    : getLayerById(state, "headline");
  const y = target ? target.y + target.height - 4 : Math.round(state.height * 0.35);
  const layer: BannerLayer = {
    id: newId("underline"),
    sceneId: scene.id,
    persistent: false,
    name: "Underline",
    type: "underline",
    visible: true,
    locked: false,
    x: target?.x ?? Math.round(state.width * 0.08),
    y,
    width: target?.width ?? Math.round(state.width * 0.4),
    height: 4,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: (target?.zIndex ?? 30) + 1,
    targetTextLayerId: target?.id,
    underlineColor: state.accentColor,
    thickness: 3,
    drawDurationMs: 600,
    offsetY: 0,
  };
  const next = {
    ...state,
    bannerLayers: [...(state.bannerLayers ?? []), layer],
    scenes: (state.scenes ?? []).map((s) =>
      s.id === scene.id ? { ...s, layerIds: [...s.layerIds, layer.id] } : s,
    ),
  };
  const withEffect = addLayerEffect(next, layer.id, "underline-draw");
  return withEffect;
}

export function staggerProductLayers(state: BannerEditorState): BannerEditorState {
  const scene = getActiveScene(state);
  if (!scene) return state;
  const products = getLayersForScene(state, scene.id).filter(
    (l) =>
      (l.type === "image" || l.type === "badge") &&
      (l.legacyKey === "product" || l.legacyKey === "decoration" || l.type === "badge"),
  );
  if (products.length === 0) return state;

  let next = state;
  products.forEach((layer, i) => {
    const preset: EffectPreset = products.length === 1 ? "zoom-in" : "slide-in-left";
    next = addLayerEffect(next, layer.id, preset);
    const effects = next.layerEffects ?? [];
    const last = effects[effects.length - 1];
    if (last) {
      next = updateLayerEffect(next, last.id, {
        startMs: i * 150,
        durationMs: 600,
      });
    }
  });
  return next;
}

export function clearSceneEffects(state: BannerEditorState): BannerEditorState {
  const scene = getActiveScene(state);
  if (!scene) return state;
  const next = {
    ...state,
    layerEffects: (state.layerEffects ?? []).filter((e) => e.sceneId !== scene.id),
  };
  return syncFlatFromActiveScene(next);
}

export function sceneTransitionClass(transition: BannerSceneTransition): string {
  return `scene-transition-${transition}`;
}

export function editorStateToProjectWithStoryboard(
  state: BannerEditorState,
  existing?: BannerProject,
): BannerProject {
  const synced = syncFlatFromActiveScene(state);
  const now = new Date().toISOString();
  return {
    id: synced.projectId,
    name: synced.name,
    status: synced.status,
    width: synced.width,
    height: synced.height,
    headline: synced.headline,
    subheadline: synced.subheadline,
    cta: synced.cta,
    backgroundColor: synced.backgroundColor,
    textColor: synced.textColor,
    ctaBackgroundColor: synced.ctaBackgroundColor,
    ctaTextColor: synced.ctaTextColor,
    accentColor: synced.accentColor,
    animation: synced.animation,
    logoLabel: synced.logoLabel,
    productImageLabel: synced.productImageLabel,
    shareId: synced.shareId || existing?.shareId || "share-unknown",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    assets: synced.assets ?? [],
    assetPlacements: synced.assetPlacements ?? [],
    textPlacements: synced.textPlacements ?? [],
    timeline: synced.timeline,
    layerAnimations: synced.layerAnimations ?? [],
    scenes: synced.scenes,
    bannerLayers: synced.bannerLayers,
    layerEffects: synced.layerEffects,
    layerKeyframes: synced.layerKeyframes,
    activeSceneId: synced.activeSceneId,
  };
}

export function hasStoryboard(state: BannerEditorState): boolean {
  return (state.scenes ?? []).length > 0;
}

export function findLayerForCanvasEdit(
  state: BannerEditorState,
  target:
    | { kind: "text"; legacyKey: string }
    | { kind: "asset"; assetId: string }
    | { kind: "layer"; layerId: string },
  sceneId?: string,
): BannerLayer | undefined {
  const sid = sceneId ?? getActiveScene(state)?.id;
  if (!sid) return undefined;
  const layers = getLayersForScene(state, sid);
  if (target.kind === "layer") {
    return layers.find((l) => l.id === target.layerId);
  }
  if (target.kind === "text") {
    return layers.find((l) => l.type === "text" && l.legacyKey === target.legacyKey);
  }
  return layers.find(
    (l) => l.assetId === target.assetId || l.id === target.assetId,
  );
}

export function updateLayerGeometryFromCanvas(
  state: BannerEditorState,
  target:
    | { kind: "text"; legacyKey: string }
    | { kind: "asset"; assetId: string }
    | { kind: "layer"; layerId: string },
  patch: Partial<Pick<BannerLayer, "x" | "y" | "width" | "height" | "rotation" | "opacity">>,
): BannerEditorState | null {
  if (!hasStoryboard(state)) return null;
  const layer = findLayerForCanvasEdit(state, target);
  if (!layer) return null;
  return updateBannerLayer(state, layer.id, patch);
}

export function selectedLayerToBannerLayerId(
  state: BannerEditorState,
  selected: SelectedLayer,
): string | null {
  const scene = getActiveScene(state);
  if (!scene) return null;
  if (selected.type === "text") {
    const layer = getLayersForScene(state, scene.id).find(
      (l) => l.type === "text" && l.legacyKey === selected.id,
    );
    return layer?.id ?? null;
  }
  const layer = getLayersForScene(state, scene.id).find(
    (l) => l.assetId === selected.id || l.id === selected.id,
  );
  return layer?.id ?? null;
}

export function transitionCss(transition: BannerSceneTransition, durationMs: number): string {
  const dur = `${durationMs}ms`;
  switch (transition) {
    case "fade":
      return `animation: sceneFade ${dur} ease-out forwards;`;
    case "swipe-left":
      return `animation: sceneSwipeLeft ${dur} ease-out forwards;`;
    case "swipe-right":
      return `animation: sceneSwipeRight ${dur} ease-out forwards;`;
    case "push-left":
      return `animation: scenePushLeft ${dur} ease-out forwards;`;
    case "push-right":
      return `animation: scenePushRight ${dur} ease-out forwards;`;
    case "swipe-up":
      return `animation: sceneSwipeUp ${dur} ease-out forwards;`;
    case "swipe-down":
      return `animation: sceneSwipeDown ${dur} ease-out forwards;`;
    default:
      return "";
  }
}

export function transitionKeyframes(): string {
  return `
@keyframes sceneFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes sceneSwipeLeft {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes sceneSwipeRight {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes sceneSwipeUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes sceneSwipeDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes scenePushLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes scenePushRight {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}`;
}
