import type { LayerEffect, LayerKeyframe } from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import { clampTiming } from "./timeline-utils";

export function clampEffectTiming(
  effect: LayerEffect,
  sceneDurationMs: number,
): LayerEffect {
  const timing = clampTiming(effect.startMs, effect.durationMs, sceneDurationMs);
  return {
    ...effect,
    startMs: timing.startMs,
    durationMs: timing.durationMs,
  };
}

export function clampKeyframeTime(
  keyframe: LayerKeyframe,
  sceneDurationMs: number,
): LayerKeyframe {
  return {
    ...keyframe,
    timeMs: Math.min(Math.max(0, keyframe.timeMs), sceneDurationMs),
  };
}

export function getEffectAtTime(
  effects: LayerEffect[],
  layerId: string,
  timeMs: number,
): LayerEffect | undefined {
  return effects.find(
    (e) =>
      e.layerId === layerId &&
      timeMs >= e.startMs &&
      timeMs <= e.startMs + e.durationMs,
  );
}

export function duplicateEffect(
  state: BannerEditorState,
  effectId: string,
): { effect: LayerEffect; state: BannerEditorState } | null {
  const effect = (state.layerEffects ?? []).find((e) => e.id === effectId);
  if (!effect) return null;
  const copy: LayerEffect = {
    ...effect,
    id: `effect-${Date.now()}`,
    startMs: effect.startMs + effect.durationMs + 50,
  };
  return {
    effect: copy,
    state: {
      ...state,
      layerEffects: [...(state.layerEffects ?? []), copy],
    },
  };
}

export function sortEffectsByStart(effects: LayerEffect[]): LayerEffect[] {
  return [...effects].sort((a, b) => a.startMs - b.startMs);
}

export const MAX_PARTICLE_COUNT = 40;

export function clampParticleCount(count: number): number {
  return Math.min(MAX_PARTICLE_COUNT, Math.max(4, Math.round(count)));
}
