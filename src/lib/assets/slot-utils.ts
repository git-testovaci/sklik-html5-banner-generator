import type { BannerAssetKind } from "@/types/assets";
import type { BannerEditorState } from "@/types/editor";
import type { BannerLayer } from "@/types/animation";
import type { TemplateAssetSlotKind } from "@/types/template-slots";
import {
  addLayerToScene,
  ensureLayerInScene,
  getActiveScene,
  getLayerById,
  getLayersForScene,
  newId,
  syncFlatFromActiveScene,
  updateBannerLayer,
} from "@/lib/animation/storyboard-utils";
import { nextMediaLayerInstanceName } from "@/lib/animation/layer-instance-utils";
import {
  defaultInsertDurationMs,
  updateLayerTimelineRange,
} from "@/lib/animation/layer-timeline-utils";

export function isSlotEmpty(layer: BannerLayer): boolean {
  return !layer.assetId;
}

export function getTemplateSlotLayers(state: BannerEditorState): BannerLayer[] {
  return (state.bannerLayers ?? []).filter((l) => l.isTemplateSlot || l.slotKind);
}

function slotKindMatches(
  layer: BannerLayer,
  kind: TemplateAssetSlotKind | BannerAssetKind,
): boolean {
  if (kind === "decoration") {
    return layer.slotKind === "image" || layer.slotKind === "badge";
  }
  if (layer.slotKind === kind) return true;
  if (layer.legacyKey === kind) return true;
  return false;
}

function layerInScene(state: BannerEditorState, layer: BannerLayer, sceneId: string): boolean {
  if (layer.persistent) return true;
  const scene = state.scenes?.find((s) => s.id === sceneId);
  return scene ? scene.layerIds.includes(layer.id) : layer.sceneId === sceneId;
}

export interface ResolveSlotOptions {
  selectedLayerId?: string;
  activeSceneId?: string;
  /** When true, filled slots can be targeted (replace flow). */
  allowFilled?: boolean;
}

export function resolveSlotForKind(
  state: BannerEditorState,
  kind: BannerAssetKind | TemplateAssetSlotKind,
  options: ResolveSlotOptions = {},
): BannerLayer | undefined {
  const slotKind: TemplateAssetSlotKind | BannerAssetKind =
    kind === "decoration" ? "image" : kind;
  const slots = getTemplateSlotLayers(state).filter((s) => slotKindMatches(s, slotKind));
  const sceneId =
    options.activeSceneId ?? state.activeSceneId ?? state.scenes?.[0]?.id;

  if (options.selectedLayerId) {
    const selected =
      getLayerById(state, options.selectedLayerId) ??
      (state.bannerLayers ?? []).find((l) => l.assetId === options.selectedLayerId);
    if (
      selected &&
      slotKindMatches(selected, slotKind) &&
      (options.allowFilled || isSlotEmpty(selected))
    ) {
      return selected;
    }
  }

  if (sceneId && slotKind !== "logo") {
    const inScene = slots.find(
      (s) =>
        !s.persistent &&
        layerInScene(state, s, sceneId) &&
        (options.allowFilled || isSlotEmpty(s)),
    );
    if (inScene) return inScene;
  }

  if (slotKind === "logo") {
    const logoSlot = slots.find((s) => s.slotKind === "logo" || s.legacyKey === "logo");
    if (logoSlot && (options.allowFilled || isSlotEmpty(logoSlot))) return logoSlot;
  }

  if (slotKind === "background") {
    const bgSlot = slots.find((s) => s.slotKind === "background" && (options.allowFilled || isSlotEmpty(s)));
    if (bgSlot) return bgSlot;
  }

  return slots.find((s) => options.allowFilled || isSlotEmpty(s));
}

export function findEmptySlotForKind(
  state: BannerEditorState,
  kind: TemplateAssetSlotKind | BannerAssetKind,
): BannerLayer | undefined {
  return resolveSlotForKind(state, kind, { allowFilled: false });
}

export function assignAssetToSlotLayer(
  state: BannerEditorState,
  layerId: string,
  assetId: string,
): BannerEditorState {
  const layer = getLayerById(state, layerId);
  if (!layer) return state;
  const patch: Partial<BannerLayer> = {
    assetId,
    type: "image",
  };
  if (layer.isTemplateSlot || layer.slotKind) {
    patch.isTemplateSlot = layer.isTemplateSlot ?? true;
    patch.slotKind = layer.slotKind;
    patch.slotLabel = layer.slotLabel;
    patch.slotId = layer.slotId;
  }
  let next = updateBannerLayer(state, layerId, patch);
  const sceneId = state.activeSceneId ?? state.scenes?.[0]?.id;
  if (sceneId && !layer.persistent) {
    next = ensureLayerInScene(next, layerId, sceneId);
    next = syncFlatFromActiveScene(next);
  }
  return next;
}

export function clearSlotAsset(
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

function placementMessageForKind(kind: BannerAssetKind, placed: boolean): string {
  if (!placed) return "Obrázek nahrán do knihovny";
  switch (kind) {
    case "logo":
      return "Logo vloženo do banneru";
    case "product":
      return "Produkt vložen do scény";
    case "background":
      return "Pozadí vloženo do scény";
    default:
      return "Obrázek vložen do banneru";
  }
}

export function placeAssetInSlot(
  state: BannerEditorState,
  assetId: string,
  kind: BannerAssetKind,
  options: ResolveSlotOptions = {},
): { state: BannerEditorState; layerId: string | null; message: string } {
  const slot = resolveSlotForKind(state, kind, { ...options, allowFilled: true });
  if (slot) {
    const next = assignAssetToSlotLayer(state, slot.id, assetId);
    const label = slot.slotLabel ?? slot.name;
    return {
      state: next,
      layerId: slot.id,
      message: `${label} — ${placementMessageForKind(kind, true).toLowerCase()}`,
    };
  }
  return {
    state,
    layerId: null,
    message: placementMessageForKind(kind, false),
  };
}

export function autoPlaceUploadedAsset(
  state: BannerEditorState,
  assetId: string,
  kind: BannerAssetKind,
): { state: BannerEditorState; layerId: string | null; message: string } {
  if (kind === "decoration") {
    return { state, layerId: null, message: "Obrázek nahrán do knihovny" };
  }
  const slot = resolveSlotForKind(state, kind, { allowFilled: false });
  if (slot) {
    const next = assignAssetToSlotLayer(state, slot.id, assetId);
    return {
      state: next,
      layerId: slot.id,
      message: placementMessageForKind(kind, true),
    };
  }
  return { state, layerId: null, message: placementMessageForKind(kind, false) };
}

export function insertImageLayerInScene(
  state: BannerEditorState,
  assetId: string,
  name = "Obrázek",
  startMs = 0,
): { state: BannerEditorState; layer: BannerLayer } {
  return addMediaLayerAtPlayhead(state, assetId, startMs, name);
}

function frontZIndexForScene(state: BannerEditorState, sceneId: string): number {
  const layers = getLayersForScene(state, sceneId);
  if (layers.length === 0) return 30;
  return Math.max(...layers.map((l) => l.zIndex), 1) + 2;
}

/** Always creates a new image layer at playhead — never reuses an existing layer. */
export function addMediaLayerAtPlayhead(
  state: BannerEditorState,
  assetId: string,
  startMs = 0,
  name?: string,
): { state: BannerEditorState; layer: BannerLayer } {
  const w = state.width;
  const h = state.height;
  const iw = Math.round(w * 0.35);
  const ih = Math.round(h * 0.35);
  const scene = getActiveScene(state);
  const instanceName = nextMediaLayerInstanceName(state, assetId);
  const layer: BannerLayer = {
    id: newId("layer"),
    sceneId: scene?.id,
    persistent: false,
    name: name ?? instanceName,
    type: "image",
    visible: true,
    locked: false,
    x: Math.round((w - iw) / 2),
    y: Math.round((h - ih) / 2),
    width: iw,
    height: ih,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: scene ? frontZIndexForScene(state, scene.id) : 30,
    assetId,
    fit: "contain",
    shadow: false,
    borderRadius: 0,
  };
  const withLayer = addLayerToScene(state, layer);
  if (!scene) return { state: withLayer, layer };
  const durationMs = defaultInsertDurationMs(scene.durationMs, startMs);
  const next = updateLayerTimelineRange(withLayer, scene.id, layer.id, startMs, durationMs);
  return { state: next, layer: getLayerById(next, layer.id)! };
}

/** Apply playhead-based timing after placing an asset into a scene layer. */
export function applyLayerTimingAtPlayhead(
  state: BannerEditorState,
  layerId: string,
  startMs: number,
): BannerEditorState {
  const scene = getActiveScene(state);
  if (!scene) return state;
  const durationMs = defaultInsertDurationMs(scene.durationMs, startMs);
  return updateLayerTimelineRange(state, scene.id, layerId, startMs, durationMs);
}

export function slotLayerSelection(layer: BannerLayer): {
  type: "asset";
  id: string;
} {
  return { type: "asset", id: layer.id };
}

export function resolveLayerFromSelection(
  state: BannerEditorState,
  selection: { type: string; id: string } | null | undefined,
): BannerLayer | undefined {
  if (!selection || selection.type !== "asset") return undefined;
  const byId = (state.bannerLayers ?? []).find((l) => l.id === selection.id);
  if (byId) return byId;
  const byAsset = (state.bannerLayers ?? []).filter((l) => l.assetId === selection.id);
  if (byAsset.length === 1) return byAsset[0];
  return undefined;
}

export function isSelectedSlotLayer(
  state: BannerEditorState,
  selection: { type: string; id: string } | null | undefined,
): boolean {
  const layer = resolveLayerFromSelection(state, selection);
  if (!layer) return false;
  return Boolean(
    layer.isTemplateSlot ||
      layer.slotKind ||
      layer.type === "image" ||
      layer.type === "badge",
  );
}

export function slotAcceptsAssetKind(
  layer: BannerLayer,
  kind: BannerAssetKind,
): boolean {
  if (kind === "decoration") {
    return layer.slotKind === "image" || layer.slotKind === "badge" || layer.slotKind === "product";
  }
  return layer.slotKind === kind || layer.legacyKey === kind;
}

export function isSelectedEmptySlot(
  state: BannerEditorState,
  selection: { type: string; id: string } | null | undefined,
): boolean {
  const layer = resolveLayerFromSelection(state, selection);
  if (!layer) return false;
  return isSlotEmpty(layer) && Boolean(layer.isTemplateSlot || layer.slotKind);
}

export function hasFilledSlot(
  state: BannerEditorState,
  kind: TemplateAssetSlotKind,
): boolean {
  return getTemplateSlotLayers(state).some(
    (l) => l.slotKind === kind && !isSlotEmpty(l),
  );
}

export function syncAssetsIntoStoryboard(
  state: BannerEditorState,
): BannerEditorState {
  if (!(state.bannerLayers ?? []).some((l) => l.isTemplateSlot || l.slotKind)) {
    return state;
  }
  return syncFlatFromActiveScene(state);
}

export function findFirstMissingRequiredSlot(
  state: BannerEditorState,
): BannerLayer | undefined {
  const slots = getTemplateSlotLayers(state);
  const logo = slots.find((s) => s.slotKind === "logo" && isSlotEmpty(s));
  if (logo) return logo;
  return slots.find(
    (s) =>
      (s.slotKind === "product" || s.slotKind === "image") && isSlotEmpty(s),
  );
}
