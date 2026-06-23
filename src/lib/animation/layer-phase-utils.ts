import type {
  BannerLayer,
  LayerAnimation,
  LayerEffect,
  LayerEffectPhase,
  LayerType,
} from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import {
  getPhaseUiPreset,
  phaseUiPresetLabel,
  type InUiPresetId,
  type LoopUiPresetId,
  type OutUiPresetId,
} from "@/lib/animation/layer-phase-presets";
import {
  getLayerTimelineRange,
  MIN_LAYER_DURATION_MS,
} from "@/lib/animation/layer-timeline-utils";
import {
  getEffectsForScene,
  getLayerById,
  getSceneById,
  newId,
  syncFlatFromActiveScene,
} from "@/lib/animation/storyboard-utils";
import { effectToLayerAnimation } from "@/lib/animation/effect-presets";

export const MIN_STATIC_SEGMENT_MS = 100;
export const DEFAULT_IN_DURATION_MS = 500;
export const DEFAULT_OUT_DURATION_MS = 400;

export interface LayerPhaseState {
  phase: "in" | "out" | "loop";
  uiPresetId: string;
  durationMs: number;
  effectId: string | null;
  label: string;
  active: boolean;
}

export interface LayerPhaseSegments {
  layerId: string;
  rangeStartMs: number;
  rangeDurationMs: number;
  inDurationMs: number;
  outDurationMs: number;
  loopActive: boolean;
  staticMs: number;
  in: LayerPhaseState;
  out: LayerPhaseState;
  loop: LayerPhaseState;
}

function uiPresetIdFromEffect(effect: LayerEffect): string {
  const stored = effect.params?.uiPresetId;
  if (typeof stored === "string" && stored.length > 0) return stored;
  return inferUiPresetFromLegacyEffect(effect);
}

function inferUiPresetFromLegacyEffect(effect: LayerEffect): string {
  const map: Partial<Record<string, string>> = {
    "fade-in": "fade-in",
    "enter-from-bottom": "slide-up",
    "enter-from-top": "slide-down",
    "enter-from-left": "slide-right",
    "enter-from-right": "slide-left",
    "zoom-in": "zoom-in",
    "bounce-in": "pop",
    "type-on-lite": "typewriter",
    "float-subtle": "float",
  };
  return map[effect.preset] ?? "fade-in";
}

export function inferEffectPhase(
  effect: LayerEffect,
  layerRangeStart: number,
  layerRangeEnd: number,
): LayerEffectPhase {
  if (effect.phase) return effect.phase;
  if (effect.loop) return "loop";
  const effectEnd = effect.startMs + effect.durationMs;
  const nearStart = effect.startMs <= layerRangeStart + 120;
  const nearEnd = effectEnd >= layerRangeEnd - 120;
  if (nearStart && !nearEnd) return "in";
  if (nearEnd && !nearStart) return "out";
  if (effect.preset === "float-subtle" || effect.preset === "word-highlight") return "loop";
  return "custom";
}

function phaseEffectsForLayer(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
): LayerEffect[] {
  return getEffectsForScene(state, sceneId).filter((e) => e.layerId === layerId);
}

function buildPhaseState(
  phase: "in" | "out" | "loop",
  effect: LayerEffect | undefined,
  layerRangeStart: number,
  layerRangeEnd: number,
): LayerPhaseState {
  if (!effect) {
    return {
      phase,
      uiPresetId: "none",
      durationMs: 0,
      effectId: null,
      label: "Žádná",
      active: false,
    };
  }
  const inferred = inferEffectPhase(effect, layerRangeStart, layerRangeEnd);
  const uiPresetId = uiPresetIdFromEffect(effect);
  const active = uiPresetId !== "none" && inferred === phase;
  return {
    phase,
    uiPresetId: active ? uiPresetId : "none",
    durationMs: active ? effect.durationMs : 0,
    effectId: effect.id,
    label: active ? phaseUiPresetLabel(phase, uiPresetId) : "Žádná",
    active,
  };
}

export function getLayerPhaseSegments(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
): LayerPhaseSegments {
  const range = getLayerTimelineRange(state, sceneId, layerId);
  const rangeStart = range.startMs;
  const rangeEnd = range.startMs + range.durationMs;
  const effects = phaseEffectsForLayer(state, sceneId, layerId);

  const inEffect = effects.find(
    (e) => inferEffectPhase(e, rangeStart, rangeEnd) === "in",
  );
  const outEffect = effects.find(
    (e) => inferEffectPhase(e, rangeStart, rangeEnd) === "out",
  );
  const loopEffect = effects.find(
    (e) => inferEffectPhase(e, rangeStart, rangeEnd) === "loop",
  );

  const inState = buildPhaseState("in", inEffect, rangeStart, rangeEnd);
  const outState = buildPhaseState("out", outEffect, rangeStart, rangeEnd);
  const loopState = buildPhaseState("loop", loopEffect, rangeStart, rangeEnd);

  const inDur = inState.active ? inState.durationMs : 0;
  const outDur = outState.active ? outState.durationMs : 0;
  const staticMs = Math.max(MIN_STATIC_SEGMENT_MS, range.durationMs - inDur - outDur);

  return {
    layerId,
    rangeStartMs: rangeStart,
    rangeDurationMs: range.durationMs,
    inDurationMs: inDur,
    outDurationMs: outDur,
    loopActive: loopState.active,
    staticMs,
    in: inState,
    out: outState,
    loop: loopState,
  };
}

export function getLayerAnimationPhases(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
): LayerPhaseSegments {
  return getLayerPhaseSegments(state, sceneId, layerId);
}

function clampPhaseDurations(
  rangeDurationMs: number,
  inMs: number,
  outMs: number,
): { inMs: number; outMs: number } {
  let inDur = Math.max(0, inMs);
  let outDur = Math.max(0, outMs);
  const maxAnim = Math.max(0, rangeDurationMs - MIN_STATIC_SEGMENT_MS);
  if (inDur + outDur > maxAnim) {
    const scale = maxAnim / Math.max(inDur + outDur, 1);
    inDur = Math.round(inDur * scale);
    outDur = Math.round(outDur * scale);
  }
  if (inDur > 0 && inDur < MIN_LAYER_DURATION_MS) inDur = MIN_LAYER_DURATION_MS;
  if (outDur > 0 && outDur < MIN_LAYER_DURATION_MS) outDur = MIN_LAYER_DURATION_MS;
  return { inMs: inDur, outMs: outDur };
}

export function layoutPhaseEffectsOnLayer(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
): BannerEditorState {
  const range = getLayerTimelineRange(state, sceneId, layerId);
  const segments = getLayerPhaseSegments(state, sceneId, layerId);
  const { inMs, outMs } = clampPhaseDurations(
    range.durationMs,
    segments.in.durationMs,
    segments.out.durationMs,
  );

  const rangeStart = range.startMs;
  const rangeEnd = range.startMs + range.durationMs;
  const loopStart = rangeStart + inMs;
  const loopDur = Math.max(MIN_STATIC_SEGMENT_MS, range.durationMs - inMs - outMs);
  const outStart = rangeStart + range.durationMs - outMs;

  const nextEffects = (state.layerEffects ?? []).map((e) => {
    if (e.sceneId !== sceneId || e.layerId !== layerId) return e;
    const phase = inferEffectPhase(e, rangeStart, rangeEnd);
    if (phase === "in" && segments.in.active) {
      return { ...e, startMs: rangeStart, durationMs: inMs, phase: "in" as const };
    }
    if (phase === "out" && segments.out.active) {
      return { ...e, startMs: outStart, durationMs: outMs, phase: "out" as const };
    }
    if (phase === "loop" && segments.loop.active) {
      return {
        ...e,
        startMs: loopStart,
        durationMs: loopDur,
        loop: true,
        phase: "loop" as const,
      };
    }
    return e;
  });

  return syncFlatFromActiveScene({ ...state, layerEffects: nextEffects });
}

function createPhaseEffect(
  layerId: string,
  sceneId: string,
  phase: "in" | "out" | "loop",
  uiPresetId: string,
  durationMs: number,
): LayerEffect {
  const def = getPhaseUiPreset(phase, uiPresetId);
  return {
    id: newId("effect"),
    layerId,
    sceneId,
    preset: def?.effectPreset ?? "fade-in",
    startMs: 0,
    durationMs,
    easing: "ease-out",
    direction: "normal",
    distancePx: def?.distancePx ?? 24,
    intensity: 1,
    loop: phase === "loop",
    phase,
    params: { uiPresetId },
  };
}

export function setLayerPhaseAnimation(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
  phase: "in" | "out" | "loop",
  uiPresetId: string,
  durationMs?: number,
): BannerEditorState {
  const scene = getSceneById(state, sceneId);
  if (!scene) return state;

  const range = getLayerTimelineRange(state, sceneId, layerId);
  const def = getPhaseUiPreset(phase, uiPresetId);

  const others = (state.layerEffects ?? []).filter(
    (e) =>
      !(
        e.sceneId === sceneId &&
        e.layerId === layerId &&
        inferEffectPhase(e, range.startMs, range.startMs + range.durationMs) === phase
      ),
  );

  if (uiPresetId === "none" || !def || def.animationPreset === "none") {
    return layoutPhaseEffectsOnLayer({ ...state, layerEffects: others }, sceneId, layerId);
  }

  const defaultDur =
    durationMs ??
    def.defaultDurationMs ??
    (phase === "in"
      ? DEFAULT_IN_DURATION_MS
      : phase === "out"
        ? DEFAULT_OUT_DURATION_MS
        : 1600);

  const newEffect = createPhaseEffect(layerId, sceneId, phase, uiPresetId, defaultDur);
  const withEffect = {
    ...state,
    layerEffects: [...others, newEffect],
  };

  return layoutPhaseEffectsOnLayer(withEffect, sceneId, layerId);
}

export function updateLayerPhaseDuration(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
  phase: "in" | "out" | "loop",
  durationMs: number,
): BannerEditorState {
  const range = getLayerTimelineRange(state, sceneId, layerId);
  const segments = getLayerPhaseSegments(state, sceneId, layerId);
  const phaseState = segments[phase];
  if (!phaseState.active || !phaseState.effectId) return state;

  const clamped =
    phase === "loop"
      ? Math.max(MIN_STATIC_SEGMENT_MS, durationMs)
      : Math.max(0, durationMs);

  const nextIn = phase === "in" ? clamped : segments.inDurationMs;
  const nextOut = phase === "out" ? clamped : segments.outDurationMs;
  const { inMs, outMs } = clampPhaseDurations(range.durationMs, nextIn, nextOut);

  const nextEffects = (state.layerEffects ?? []).map((e) => {
    if (e.id !== phaseState.effectId) return e;
    if (phase === "loop") return { ...e, durationMs: clamped };
    return { ...e, durationMs: phase === "in" ? inMs : outMs };
  });

  return layoutPhaseEffectsOnLayer({ ...state, layerEffects: nextEffects }, sceneId, layerId);
}

export function clearLayerPhaseAnimation(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
  phase: "in" | "out" | "loop",
): BannerEditorState {
  return setLayerPhaseAnimation(state, sceneId, layerId, phase, "none");
}

export function phaseEffectToLayerAnimation(
  effect: LayerEffect,
  layerType: LayerType,
  animLayerId: string,
): LayerAnimation | null {
  const uiPresetId = uiPresetIdFromEffect(effect);
  const phase = effect.phase ?? "custom";

  if (phase === "in" || phase === "out" || phase === "loop") {
    const def = getPhaseUiPreset(phase, uiPresetId);
    if (!def || def.animationPreset === "none" || uiPresetId === "none") return null;

    const base = effectToLayerAnimation(effect, layerType);
    const isOut = phase === "out";

    return {
      ...base,
      layerId: animLayerId,
      preset: def.animationPreset,
      enterFrom: def.enterFrom ?? base.enterFrom,
      startMs: effect.startMs,
      durationMs: effect.durationMs,
      direction: "normal",
      opacityFrom: isOut ? 1 : def.animationPreset === "fade-in" ? 0 : base.opacityFrom,
      opacityTo: isOut ? 0 : base.opacityTo,
      scaleFrom: def.animationPreset === "zoom-in" ? 0.65 : isOut ? 1 : base.scaleFrom,
      scaleTo: isOut && def.id === "shrink" ? 0.75 : isOut ? 1 : base.scaleTo,
      phase,
      phaseUiPresetId: uiPresetId,
      enabled: true,
    };
  }

  const anim = effectToLayerAnimation(effect, layerType);
  return { ...anim, layerId: animLayerId, phase: "custom" };
}

export function layerTypeFromBannerLayer(layer: BannerLayer | undefined): LayerType {
  if (!layer) return "decoration";
  if (layer.legacyKey === "headline") return "headline";
  if (layer.legacyKey === "subheadline") return "subheadline";
  if (layer.legacyKey === "cta") return "cta";
  if (layer.legacyKey === "logo") return "logo";
  if (layer.legacyKey === "product") return "product";
  if (layer.legacyKey === "background") return "background";
  return "decoration";
}

export function buildPhaseLayerAnimationsForScene(
  state: BannerEditorState,
  sceneId: string,
): LayerAnimation[] {
  const anims: LayerAnimation[] = [];
  for (const effect of getEffectsForScene(state, sceneId)) {
    const layer = getLayerById(state, effect.layerId);
    const animLayerId =
      layer?.legacyKey ??
      (layer?.type === "text" ? layer.id : layer?.assetId ?? effect.layerId);
    const anim = phaseEffectToLayerAnimation(
      effect,
      layerTypeFromBannerLayer(layer),
      animLayerId,
    );
    if (anim) anims.push(anim);
  }
  return anims;
}

export function isTextLayer(layer: BannerLayer | undefined): boolean {
  return layer?.type === "text";
}

export type PhasePresetId = InUiPresetId | OutUiPresetId | LoopUiPresetId;

export function phaseSegmentTooltip(
  phase: LayerPhaseState,
  kind: "in" | "out" | "loop",
): string {
  if (!phase.active) {
    return kind === "loop" ? "Bez smyčky" : `${kind === "in" ? "Dopředu" : "Dozadu"}: Žádná`;
  }
  const prefix = kind === "in" ? "Dopředu" : kind === "out" ? "Dozadu" : "Smyčka";
  return `${prefix}: ${phase.label} · ${(phase.durationMs / 1000).toFixed(2)} s`;
}
