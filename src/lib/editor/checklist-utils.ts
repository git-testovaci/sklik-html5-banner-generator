import type { BannerEditorState } from "@/types/editor";
import { getTemplateSlotLayers, hasFilledSlot, isSlotEmpty } from "@/lib/assets/slot-utils";

const DEFAULT_HEADLINES = new Set([
  "váš nadpis zde",
  "headline here",
  "imported headline",
  "headline",
]);

const DEFAULT_SUBHEADLINES = new Set([
  "podnadpis nebo krátký popis",
  "subheadline",
]);

export function hasStoryboardTemplate(state: BannerEditorState): boolean {
  const scenes = state.scenes ?? [];
  if (scenes.length >= 2) return true;
  return (state.bannerLayers ?? []).some((l) => l.isTemplateSlot || l.slotKind);
}

export function textsLookEdited(state: BannerEditorState): boolean {
  const sceneId = state.activeSceneId ?? state.scenes?.[0]?.id;
  const textLayers = (state.bannerLayers ?? []).filter((l) => l.type === "text");
  const headlineLayer = textLayers.find(
    (l) => l.legacyKey === "headline" && (!sceneId || l.sceneId === sceneId || l.persistent),
  );
  const headline = (headlineLayer?.text ?? state.headline).trim();
  const sub = (state.subheadline ?? "").trim().toLowerCase();

  if (!headline || DEFAULT_HEADLINES.has(headline.toLowerCase())) return false;
  if (DEFAULT_SUBHEADLINES.has(sub) && headline.length < 12) return false;
  return true;
}

export function transitionsConfigured(state: BannerEditorState): boolean {
  const scenes = state.scenes ?? [];
  if (scenes.length <= 1) return true;
  return scenes.some((s) => s.transitionOut !== "none");
}

export function allTransitionsNone(state: BannerEditorState): boolean {
  const scenes = state.scenes ?? [];
  if (scenes.length <= 1) return false;
  return scenes.every((s) => s.transitionOut === "none");
}

export function hasAnimations(state: BannerEditorState): boolean {
  return (state.layerEffects ?? []).length > 0;
}

export function logoChecklistStatus(state: BannerEditorState): "done" | "warn" | "missing" {
  const slots = getTemplateSlotLayers(state).filter((s) => s.slotKind === "logo");
  if (slots.length === 0) {
    return (state.assets ?? []).some((a) => a.kind === "logo") ? "done" : "missing";
  }
  return hasFilledSlot(state, "logo") ? "done" : "warn";
}

export function findFirstTransitionSceneNeedingAttention(
  state: BannerEditorState,
): string | undefined {
  const scenes = state.scenes ?? [];
  if (scenes.length === 0) return undefined;
  if (scenes.length === 1) return scenes[0]?.id;
  const noneScene = scenes.find((s) => s.transitionOut === "none");
  return noneScene?.id ?? scenes[0]?.id;
}

export function productChecklistStatus(state: BannerEditorState): "done" | "warn" | "missing" {
  const slots = getTemplateSlotLayers(state).filter(
    (s) => s.slotKind === "product" || s.slotKind === "image",
  );
  if (slots.length === 0) {
    return (state.assets ?? []).some((a) => a.kind === "product") ? "done" : "missing";
  }
  const filled = slots.some((s) => !isSlotEmpty(s));
  const requiredEmpty = slots.some((s) => s.slotKind === "product" && isSlotEmpty(s));
  if (filled) return "done";
  return requiredEmpty ? "warn" : "missing";
}
