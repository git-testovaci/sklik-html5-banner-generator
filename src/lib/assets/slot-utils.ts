import type { BannerAssetKind } from "@/types/assets";
import type { BannerEditorState } from "@/types/editor";
import type { BannerLayer } from "@/types/animation";
import type { TemplateAssetSlotKind } from "@/types/template-slots";
import {
  getLayerById,
  syncFlatFromActiveScene,
  updateBannerLayer,
} from "@/lib/animation/storyboard-utils";

export function isSlotEmpty(layer: BannerLayer): boolean {
  return !layer.assetId;
}

export function getTemplateSlotLayers(state: BannerEditorState): BannerLayer[] {
  return (state.bannerLayers ?? []).filter((l) => l.isTemplateSlot || l.slotKind);
}

export function findEmptySlotForKind(
  state: BannerEditorState,
  kind: TemplateAssetSlotKind | BannerAssetKind,
): BannerLayer | undefined {
  const slots = getTemplateSlotLayers(state).filter(isSlotEmpty);
  const match = slots.find((s) => s.slotKind === kind || s.legacyKey === kind);
  if (match) return match;
  if (kind === "decoration") {
    return slots.find((s) => s.slotKind === "image" || s.slotKind === "badge");
  }
  return undefined;
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
    type: layer.type === "badge" ? "badge" : "image",
  };
  return updateBannerLayer(state, layerId, patch);
}

export function autoPlaceUploadedAsset(
  state: BannerEditorState,
  assetId: string,
  kind: BannerAssetKind,
): { state: BannerEditorState; layerId: string | null; message: string } {
  const slotKind: TemplateAssetSlotKind | BannerAssetKind =
    kind === "decoration" ? "image" : kind;
  const slot = findEmptySlotForKind(state, slotKind);
  if (slot) {
    const next = assignAssetToSlotLayer(state, slot.id, assetId);
    const label = slot.slotLabel ?? slot.name;
    return {
      state: next,
      layerId: slot.id,
      message: `${label} vloženo do banneru`,
    };
  }

  const assets = state.assets ?? [];
  const asset = assets.find((a) => a.id === assetId);
  if (!asset) {
    return { state, layerId: null, message: "Obrázek nahrán do knihovny" };
  }

  const placement = (state.assetPlacements ?? []).find((p) => p.assetId === assetId);
  if (placement) {
    return { state, layerId: assetId, message: "Obrázek nahrán a umístěn" };
  }

  return { state, layerId: null, message: "Obrázek nahrán do knihovny" };
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
  return (state.bannerLayers ?? []).find(
    (l) => l.id === selection.id || l.assetId === selection.id,
  );
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
