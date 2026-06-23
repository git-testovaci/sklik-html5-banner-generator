import type { LayerEffect } from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import {
  getPhaseUiPreset,
  type InUiPresetId,
  type LoopUiPresetId,
} from "@/lib/animation/layer-phase-presets";
import {
  clampTimelineRange,
} from "@/lib/animation/layer-timeline-utils";
import { repairEditorInvariants } from "@/lib/editor/editor-invariants";
import {
  getLayerById,
  newId,
  syncFlatFromActiveScene,
  updateBannerLayer,
} from "@/lib/animation/storyboard-utils";
import type { TemplateEffectSpec, TemplateLayerTiming } from "@/types/storyboard-templates";

function createPhaseEffect(
  layerId: string,
  sceneId: string,
  phase: "in" | "out" | "loop",
  uiPresetId: string,
  startMs: number,
  durationMs: number,
): LayerEffect {
  const def = getPhaseUiPreset(phase, uiPresetId);
  return {
    id: newId("effect"),
    layerId,
    sceneId,
    preset: def?.effectPreset ?? "fade-in",
    startMs,
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

function presetToInUi(preset: string): InUiPresetId {
  const map: Record<string, InUiPresetId> = {
    "fade-in": "fade-in",
    "slight-drop-in": "pop",
    "enter-from-top": "slide-down",
    "enter-from-bottom": "slide-up",
    "enter-from-left": "slide-right",
    "enter-from-right": "slide-left",
    "slide-in-left": "slide-right",
    "slide-in-right": "slide-left",
    "zoom-in": "zoom-in",
    "bounce-in": "pop",
    "flip-180": "zoom-in",
    "zoom-rotate-badge": "zoom-in",
    "underline-draw": "fade-in",
    "type-on-lite": "typewriter",
  };
  return map[preset] ?? "fade-in";
}

function presetToLoopUi(preset: string): LoopUiPresetId | undefined {
  if (preset === "float-subtle") return "float";
  if (preset === "word-highlight") return "glow";
  return undefined;
}

/** Convert legacy effect specs into timeline + phase timings. */
export function effectsToLayerTimings(
  effects: TemplateEffectSpec[],
  sceneDurationMs: number,
): TemplateLayerTiming[] {
  const byRef = new Map<string, TemplateLayerTiming>();

  for (const fx of effects) {
    const startMs = fx.startMs ?? 0;
    const ref = fx.layerRef;
    let entry = byRef.get(ref);
    if (!entry) {
      entry = {
        layerRef: ref,
        startMs,
        durationMs: Math.max(100, sceneDurationMs - startMs),
      };
      byRef.set(ref, entry);
    } else {
      entry.startMs = Math.min(entry.startMs, startMs);
      entry.durationMs = Math.max(
        entry.durationMs ?? 100,
        sceneDurationMs - entry.startMs,
      );
    }

    const loopUi = presetToLoopUi(fx.preset);
    if (loopUi) {
      entry.loopUi = loopUi;
      entry.loopDurationMs = fx.durationMs ?? 1400;
    } else if (!entry.inUi) {
      entry.inUi = presetToInUi(fx.preset);
      entry.inDurationMs = fx.durationMs ?? 500;
    }
  }

  return [...byRef.values()];
}

export function capCutSceneTimings(
  sceneDurationMs: number,
  config: {
    headline?: string;
    subheadline?: string;
    product?: string;
    cta?: string;
    badge?: string;
    logo?: string;
    extras?: TemplateLayerTiming[];
  },
): TemplateLayerTiming[] {
  const endPad = Math.min(400, Math.round(sceneDurationMs * 0.08));
  const timings: TemplateLayerTiming[] = [];

  if (config.logo) {
    timings.push({
      layerRef: config.logo,
      startMs: 0,
      durationMs: sceneDurationMs,
      inUi: "fade-in",
      inDurationMs: 400,
    });
  }

  if (config.headline) {
    timings.push({
      layerRef: config.headline,
      startMs: 0,
      durationMs: sceneDurationMs,
      inUi: "fade-in",
      inDurationMs: 500,
      outUi: "fade-out",
      outDurationMs: 350,
    });
  }

  if (config.subheadline) {
    timings.push({
      layerRef: config.subheadline,
      startMs: Math.min(280, Math.round(sceneDurationMs * 0.08)),
      durationMs: Math.max(100, sceneDurationMs - 280),
      inUi: "fade-in",
      inDurationMs: 450,
    });
  }

  if (config.product) {
    timings.push({
      layerRef: config.product,
      startMs: Math.min(420, Math.round(sceneDurationMs * 0.12)),
      durationMs: Math.max(100, sceneDurationMs - 420),
      inUi: "slide-left",
      inDurationMs: 550,
    });
  }

  if (config.badge) {
    const start = Math.round(sceneDurationMs * 0.45);
    timings.push({
      layerRef: config.badge,
      startMs: start,
      durationMs: Math.max(100, sceneDurationMs - start - endPad),
      inUi: "pop",
      inDurationMs: 450,
      loopUi: "pulse",
      loopDurationMs: 1200,
    });
  }

  if (config.cta) {
    const start = Math.round(sceneDurationMs * 0.58);
    timings.push({
      layerRef: config.cta,
      startMs: start,
      durationMs: Math.max(100, sceneDurationMs - start),
      inUi: "zoom-in",
      inDurationMs: 500,
      loopUi: "float",
      loopDurationMs: 1600,
    });
  }

  if (config.extras?.length) {
    timings.push(...config.extras);
  }

  return timings;
}

export function applyTemplateSceneTimings(
  state: BannerEditorState,
  sceneId: string,
  sceneDurationMs: number,
  refs: Map<string, string>,
  timings: TemplateLayerTiming[],
): BannerEditorState {
  let next = state;
  const newEffects: LayerEffect[] = [...(next.layerEffects ?? [])];

  for (const spec of timings) {
    const layerId = refs.get(spec.layerRef) ?? spec.layerRef;
    if (!getLayerById(next, layerId)) continue;

    const durationMs =
      spec.durationMs ?? Math.max(100, sceneDurationMs - spec.startMs);
    const range = clampTimelineRange(spec.startMs, durationMs, sceneDurationMs);

    next = updateBannerLayer(next, layerId, {
      timelineStartMs: range.startMs,
      timelineDurationMs: range.durationMs,
    });

    const inDur = spec.inUi && spec.inUi !== "none" ? (spec.inDurationMs ?? 500) : 0;
    const outDur = spec.outUi && spec.outUi !== "none" ? (spec.outDurationMs ?? 400) : 0;
    const loopDur =
      spec.loopUi && spec.loopUi !== "none" ? (spec.loopDurationMs ?? 1400) : 0;

    if (inDur > 0 && spec.inUi && spec.inUi !== "none") {
      newEffects.push(
        createPhaseEffect(
          layerId,
          sceneId,
          "in",
          spec.inUi,
          range.startMs,
          Math.min(inDur, range.durationMs),
        ),
      );
    }

    if (loopDur > 0 && spec.loopUi && spec.loopUi !== "none") {
      const loopStart = range.startMs + inDur;
      const loopDuration = Math.max(
        100,
        Math.min(loopDur, range.durationMs - inDur - outDur),
      );
      newEffects.push(
        createPhaseEffect(
          layerId,
          sceneId,
          "loop",
          spec.loopUi,
          loopStart,
          loopDuration,
        ),
      );
    }

    if (outDur > 0 && spec.outUi && spec.outUi !== "none") {
      const outStart = range.startMs + range.durationMs - outDur;
      newEffects.push(
        createPhaseEffect(
          layerId,
          sceneId,
          "out",
          spec.outUi,
          outStart,
          Math.min(outDur, range.durationMs),
        ),
      );
    }
  }

  next = { ...next, layerEffects: newEffects };
  return syncFlatFromActiveScene(next);
}

/** Validate and repair storyboard state after template apply. */
export function normalizeStoryboardTemplateState(
  state: BannerEditorState,
): BannerEditorState {
  const activeSceneId = state.activeSceneId ?? state.scenes?.[0]?.id;
  return syncFlatFromActiveScene(
    repairEditorInvariants({ ...state, activeSceneId }),
  );
}

export function fullSceneTiming(
  layerRef: string,
  sceneDurationMs: number,
  inUi: InUiPresetId = "fade-in",
): TemplateLayerTiming {
  return {
    layerRef,
    startMs: 0,
    durationMs: sceneDurationMs,
    inUi,
    inDurationMs: 500,
  };
}
