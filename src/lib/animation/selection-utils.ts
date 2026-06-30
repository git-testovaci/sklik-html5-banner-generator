import type { BannerLayer } from "@/types/animation";
import type { BannerEditorState, EditorSelection, SelectedLayer } from "@/types/editor";

export const EMPTY_SELECTION_ID = "__none__";

function getLayerById(
  state: BannerEditorState,
  layerId: string,
): BannerLayer | undefined {
  return (state.bannerLayers ?? []).find((l) => l.id === layerId);
}

/** Canonical empty canvas / no-layer selection. */
export function emptyEditorSelection(): SelectedLayer {
  return { type: "asset", id: EMPTY_SELECTION_ID };
}

export function isEmptyEditorSelection(
  selection: SelectedLayer | null | undefined,
): boolean {
  return (
    !selection ||
    (selection.type === "asset" && selection.id === EMPTY_SELECTION_ID)
  );
}

/** Build selection for a concrete banner layer instance (prefers layer.id for media). */
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

/** Resolve selection from a layer id when the layer record is available. */
export function selectionForLayerId(
  state: BannerEditorState,
  layerId: string,
): SelectedLayer {
  const layer = getLayerById(state, layerId);
  if (layer) return selectionForBannerLayer(layer);
  return { type: "asset", id: layerId };
}

export interface ResolveLayerForSelectionOptions {
  /** Prefer this scene when resolving legacy text keys. */
  preferSceneId?: string;
}

type LegacyTextKey = "headline" | "subheadline" | "cta";

function findTextLayerByLegacyKey(
  state: BannerEditorState,
  legacyKey: LegacyTextKey,
  preferSceneId?: string,
): BannerLayer | undefined {
  const layers = state.bannerLayers ?? [];
  if (preferSceneId) {
    const inPreferred = layers.find(
      (l) =>
        l.sceneId === preferSceneId &&
        l.type === "text" &&
        l.legacyKey === legacyKey,
    );
    if (inPreferred) return inPreferred;
  }
  const activeSceneId = state.activeSceneId;
  if (activeSceneId) {
    const inActive = layers.find(
      (l) =>
        l.sceneId === activeSceneId &&
        l.type === "text" &&
        l.legacyKey === legacyKey,
    );
    if (inActive) return inActive;
  }
  return layers.find((l) => l.type === "text" && l.legacyKey === legacyKey);
}

/** Legacy assetId lookup — only when exactly one layer uses that asset. */
function findLayerByUniqueAssetId(
  state: BannerEditorState,
  assetId: string,
): BannerLayer | undefined {
  const matches = (state.bannerLayers ?? []).filter((l) => l.assetId === assetId);
  if (matches.length === 1) return matches[0];
  return undefined;
}

/** Resolve a selection to the concrete BannerLayer instance (global, not active-scene only). */
export function resolveBannerLayerForSelection(
  state: BannerEditorState,
  selection: SelectedLayer | EditorSelection,
  options?: ResolveLayerForSelectionOptions,
): BannerLayer | undefined {
  if (selection.type === "scene" || selection.type === "effect") return undefined;
  if (selection.type === "layer") return getLayerById(state, selection.layerId);

  if (isEmptyEditorSelection(selection)) return undefined;

  if (selection.type === "text") {
    return findTextLayerByLegacyKey(state, selection.id, options?.preferSceneId);
  }

  const byLayerId = getLayerById(state, selection.id);
  if (byLayerId) return byLayerId;

  return findLayerByUniqueAssetId(state, selection.id);
}

/** Alias for resolveBannerLayerForSelection — inspector / panel entry point. */
export function resolveSelectedLayerRecord(
  state: BannerEditorState,
  selection: SelectedLayer | EditorSelection,
  options?: ResolveLayerForSelectionOptions,
): BannerLayer | undefined {
  return resolveBannerLayerForSelection(state, selection, options);
}

function repairFlatEditorSelection(
  state: BannerEditorState,
  selected: SelectedLayer,
): SelectedLayer {
  if (selected.type === "text") {
    const exists = (state.textPlacements ?? []).some((p) => p.layerId === selected.id);
    return exists ? selected : { type: "text", id: "headline" };
  }
  if (selected.type === "asset") {
    if (getLayerById(state, selected.id)) return selected;
    const exists = (state.assetPlacements ?? []).some((p) => p.assetId === selected.id);
    if (exists) {
      const byAsset = findLayerByUniqueAssetId(state, selected.id);
      if (byAsset) return selectionForBannerLayer(byAsset);
      return selected;
    }
    const first = (state.assetPlacements ?? [])[0];
    if (first) return { type: "asset", id: first.assetId };
    return { type: "text", id: "headline" };
  }
  return selected;
}

/** Repair or clear selection after state mutations (delete, undo, template apply, …). */
export function repairEditorSelection(
  state: BannerEditorState,
  selected: SelectedLayer,
): SelectedLayer {
  if (isEmptyEditorSelection(selected)) return emptyEditorSelection();

  const layer = resolveBannerLayerForSelection(state, selected);
  if (layer) return selectionForBannerLayer(layer);

  if ((state.scenes ?? []).length === 0) {
    return repairFlatEditorSelection(state, selected);
  }

  return emptyEditorSelection();
}

/** Backward-compatible alias used by history / onUpdate repair paths. */
export function resolveSelectedLayer(
  state: BannerEditorState,
  selected: SelectedLayer,
): SelectedLayer {
  return repairEditorSelection(state, selected);
}

export function selectedLayerId(
  selection: SelectedLayer | EditorSelection,
): string | null {
  if (selection.type === "layer") return selection.layerId;
  if (selection.type === "text") return selection.id;
  if (selection.type === "asset" && selection.id !== EMPTY_SELECTION_ID) {
    return selection.id;
  }
  return null;
}

export function isLayerSelected(
  selection: SelectedLayer | null | undefined,
  layer: BannerLayer,
): boolean {
  if (!selection || isEmptyEditorSelection(selection)) return false;
  const target = selectionForBannerLayer(layer);
  return selection.type === target.type && selection.id === target.id;
}

/** Canvas asset placement highlight — resolves by banner layer id, not shared assetId. */
export function isAssetPlacementSelected(
  selection: SelectedLayer | null | undefined,
  assetId: string,
  storyboardLayers: BannerLayer[],
  bannerLayerId?: string,
): boolean {
  if (!selection || selection.type !== "asset") return false;
  if (bannerLayerId) return selection.id === bannerLayerId;
  const sbLayer = storyboardLayers.find((l) => l.id === selection.id);
  if (sbLayer) return sbLayer.assetId === assetId;
  if (selection.id === assetId) {
    return storyboardLayers.filter((l) => l.assetId === assetId).length === 1;
  }
  return false;
}
