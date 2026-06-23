import type { BannerAssetKind } from "@/types/assets";
import type { BannerLayer } from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import { getActiveScene, getLayersForScene } from "@/lib/animation/storyboard-utils";

const KIND_BASE_LABELS: Record<BannerAssetKind, string> = {
  logo: "Logo",
  product: "Produkt",
  background: "Pozadí",
  decoration: "Obrázek",
};

/** CSS/animation target id — legacy keys for template text/slots, banner layer id for instances. */
export function animationTargetIdForLayer(
  layer: BannerLayer | undefined,
  fallbackId: string,
): string {
  if (!layer) return fallbackId;
  if (layer.legacyKey) return layer.legacyKey;
  return layer.id;
}

export function countLayerInstancesUsingAsset(
  state: BannerEditorState,
  assetId: string,
): number {
  const scene = getActiveScene(state);
  if (!scene) {
    return (state.bannerLayers ?? []).filter((l) => l.assetId === assetId).length;
  }
  return getLayersForScene(state, scene.id).filter((l) => l.assetId === assetId).length;
}

export function nextMediaLayerInstanceName(
  state: BannerEditorState,
  assetId: string,
): string {
  const asset = (state.assets ?? []).find((a) => a.id === assetId);
  const base = asset ? KIND_BASE_LABELS[asset.kind] : "Obrázek";
  const scene = getActiveScene(state);
  if (!scene) return base;

  const kind = asset?.kind ?? "decoration";
  const sameKindLayers = getLayersForScene(state, scene.id).filter((l) => {
    if (!l.assetId) return false;
    const a = (state.assets ?? []).find((x) => x.id === l.assetId);
    return (a?.kind ?? "decoration") === kind;
  });

  const n = sameKindLayers.length + 1;
  return n === 1 ? base : `${base} ${n}`;
}

export function layerDisplayStackLabel(
  layer: BannerLayer,
  state: BannerEditorState,
): string {
  if (layer.type === "text") {
    if (layer.legacyKey === "headline") return "Nadpis";
    if (layer.legacyKey === "subheadline") return "Podnadpis";
    if (layer.legacyKey === "cta") return "Výzva k akci";
    return layer.text?.trim() || layer.name || "Text";
  }
  if (layer.name?.trim()) return layer.name;
  if (layer.assetId) {
    const asset = (state.assets ?? []).find((a) => a.id === layer.assetId);
    if (asset) return asset.fileName;
  }
  return layer.slotLabel ?? "Vrstva";
}
