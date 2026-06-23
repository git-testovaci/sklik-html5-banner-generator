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
  return (state.bannerLayers ?? []).filter(
    (l) => l.assetId === assetId && !l.persistent,
  ).length;
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

const DUPLICATE_BASE: Partial<Record<string, string>> = {
  headline: "Nadpis",
  subheadline: "Podnadpis",
  cta: "Výzva k akci",
  logo: "Logo",
  product: "Produkt",
  background: "Pozadí",
};

function stripNumericSuffix(name: string): string {
  return name.replace(/ \d+$/, "").trim();
}

/** Base label for duplicate naming — Text 2, CTA 2, Logo 2, … */
export function duplicateNameBase(layer: BannerLayer, state: BannerEditorState): string {
  if (layer.legacyKey && DUPLICATE_BASE[layer.legacyKey]) {
    return DUPLICATE_BASE[layer.legacyKey]!;
  }
  if (layer.type === "text") {
    const base = stripNumericSuffix(layer.name || "Text");
    return base || "Text";
  }
  if (layer.type === "badge" && layer.text && !layer.assetId) {
    const base = stripNumericSuffix(layer.name || "Výzva k akci");
    return base || "Výzva k akci";
  }
  if (layer.assetId) {
    const asset = (state.assets ?? []).find((a) => a.id === layer.assetId);
    if (asset) return KIND_BASE_LABELS[asset.kind] ?? "Obrázek";
  }
  const base = stripNumericSuffix(layer.name || "Vrstva");
  if (layer.type === "badge") return base || "Štítek";
  if (layer.type === "shape") return base || "Tvar";
  return base || "Vrstva";
}

export function nextDuplicateLayerName(
  state: BannerEditorState,
  sceneId: string,
  source: BannerLayer,
): string {
  const base = duplicateNameBase(source, state);
  const layers = getLayersForScene(state, sceneId);
  const count = layers.filter((l) => duplicateNameBase(l, state) === base).length + 1;
  return count <= 1 ? base : `${base} ${count}`;
}
