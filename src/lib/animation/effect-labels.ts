import type { BannerLayer, EffectPreset, LayerEffect } from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import type { BannerSceneTransition } from "@/types/animation";
import { effectPresetDefaults } from "@/lib/animation/effect-presets";
import { getLayerById } from "@/lib/animation/storyboard-utils";

const FRIENDLY_CS: Partial<Record<EffectPreset, string>> = {
  "enter-from-top": "Přijede shora",
  "enter-from-bottom": "Přijede zdola",
  "enter-from-left": "Přijede zleva",
  "enter-from-right": "Přijede zprava",
  "fade-in": "Postupné zobrazení",
  "line-by-line-reveal": "Odhalení po řádcích",
  "word-highlight": "Zvýraznění slova",
  "underline-draw": "Podtržení se nakreslí",
  "type-on-lite": "Postupné psaní",
  "slight-drop-in": "Spadne na místo",
  "slide-in-left": "Najede zleva",
  "slide-in-right": "Najede zprava",
  "zoom-in": "Přiblížení",
  "zoom-rotate-in": "Přiblížení s otočením",
  "flip-in-y": "Otočení",
  "product-stagger": "Produkty postupně",
  "float-subtle": "Jemný pohyb",
  "scene-swipe-left": "Přechod doleva",
  "scene-swipe-right": "Přechod doprava",
  "scene-fade": "Prolnutí scén",
  "flip-180": "Otočení odznaku",
  "zoom-rotate-badge": "Přiblížení + otočení",
  "dust-to-clean": "Částice se čistí",
  "air-particles": "Částice proudí",
  "floating-clean-dots": "Jemné částice",
  "bounce-in": "Vyskočí na místo",
  "scene-push-left": "Posun scény doleva",
};

const TRANSITION_CS: Record<BannerSceneTransition, string> = {
  none: "Bez přechodu",
  fade: "Prolnutí",
  "swipe-left": "Swipe doleva",
  "swipe-right": "Swipe doprava",
  "swipe-up": "Swipe nahoru",
  "swipe-down": "Swipe dolů",
  "push-left": "Push doleva",
  "push-right": "Push doprava",
};

export function effectFriendlyLabel(preset: EffectPreset): string {
  return FRIENDLY_CS[preset] ?? effectPresetDefaults(preset).label;
}

export function transitionFriendlyLabel(transition: BannerSceneTransition): string {
  return TRANSITION_CS[transition] ?? transition;
}

export function layerDisplayName(layer: BannerLayer | undefined): string {
  if (!layer) return "Vrstva";
  if (layer.slotKind === "logo") return "Logo";
  if (layer.slotKind === "product") return "Produkt";
  if (layer.slotKind === "background") return "Pozadí";
  if (layer.slotKind === "image") return "Obrázek";
  if (layer.slotKind === "badge") return "Odznak";
  if (layer.type === "text") {
    if (layer.legacyKey === "headline") return "Nadpis";
    if (layer.legacyKey === "subheadline") return "Podnadpis";
    if (layer.legacyKey === "cta") return "Výzva k akci";
    return layer.text?.slice(0, 28) || layer.name || "Text";
  }
  if (layer.slotLabel) return layer.slotLabel;
  if (layer.type === "image" || layer.legacyKey === "product") return "Produkt";
  if (layer.type === "badge" || layer.type === "shape") return layer.text || layer.name || "Odznak";
  if (layer.type === "underline") return "Podtržení";
  if (layer.type === "particle") return "Částice";
  if (layer.legacyKey === "logo") return "Logo";
  return layer.name || "Vrstva";
}

export function describeLayerEffect(
  state: BannerEditorState,
  effect: LayerEffect,
): string {
  const layer = getLayerById(state, effect.layerId);
  return `${layerDisplayName(layer)} — ${effectFriendlyLabel(effect.preset)}`;
}

/** Compact line for animation story summary, e.g. "0.0 s — Nadpis přijede shora" */
export function effectStoryLine(
  state: BannerEditorState,
  effect: LayerEffect,
): string {
  const layer = getLayerById(state, effect.layerId);
  const name = layerDisplayName(layer);
  const action = effectFriendlyLabel(effect.preset);
  const at = (effect.startMs / 1000).toFixed(1);
  return `${at} s — ${name} ${action.charAt(0).toLowerCase()}${action.slice(1)}`;
}

export function findActiveEffectAtTime(
  effects: LayerEffect[],
  timeMs: number,
): LayerEffect | undefined {
  return effects.find(
    (e) => timeMs >= e.startMs && timeMs < e.startMs + e.durationMs,
  );
}

export function effectGroupForLayer(layer: BannerLayer | undefined): string {
  if (!layer) return "Efekty";
  if (layer.type === "text") return "Text";
  if (layer.type === "image" || layer.legacyKey === "logo" || layer.legacyKey === "product") {
    return "Obrázky";
  }
  if (layer.type === "underline" || layer.type === "particle") return "Efekty";
  return "Ostatní";
}
