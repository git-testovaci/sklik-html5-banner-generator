import type { AnimationEnterFrom, AnimationPreset, EffectPreset, LayerEffectPhase } from "@/types/animation";

export type InUiPresetId =
  | "none"
  | "fade-in"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "zoom-in"
  | "pop"
  | "typewriter";

export type OutUiPresetId =
  | "none"
  | "fade-out"
  | "slide-up-out"
  | "slide-down-out"
  | "slide-left-out"
  | "slide-right-out"
  | "zoom-out"
  | "shrink";

export type LoopUiPresetId =
  | "none"
  | "pulse"
  | "float"
  | "shake"
  | "glow"
  | "rotate-slow";

export interface PhaseUiPresetDef {
  id: string;
  label: string;
  phase: LayerEffectPhase;
  effectPreset: EffectPreset;
  animationPreset: AnimationPreset;
  enterFrom?: AnimationEnterFrom;
  textOnly?: boolean;
  defaultDurationMs: number;
  loop?: boolean;
  distancePx?: number;
}

export const IN_UI_PRESETS: PhaseUiPresetDef[] = [
  { id: "none", label: "Žádná", phase: "in", effectPreset: "fade-in", animationPreset: "none", defaultDurationMs: 0 },
  { id: "fade-in", label: "Prolnutí", phase: "in", effectPreset: "fade-in", animationPreset: "fade-in", defaultDurationMs: 500 },
  { id: "slide-up", label: "Přijede zdola", phase: "in", effectPreset: "enter-from-bottom", animationPreset: "slide-up", enterFrom: "down", defaultDurationMs: 600, distancePx: 24 },
  { id: "slide-down", label: "Přijede shora", phase: "in", effectPreset: "enter-from-top", animationPreset: "slide-down", enterFrom: "up", defaultDurationMs: 600, distancePx: 24 },
  { id: "slide-left", label: "Přijede zprava", phase: "in", effectPreset: "enter-from-right", animationPreset: "slide-in-right", enterFrom: "right", defaultDurationMs: 600, distancePx: 28 },
  { id: "slide-right", label: "Přijede zleva", phase: "in", effectPreset: "enter-from-left", animationPreset: "slide-in-left", enterFrom: "left", defaultDurationMs: 600, distancePx: 28 },
  { id: "zoom-in", label: "Přiblížení", phase: "in", effectPreset: "zoom-in", animationPreset: "zoom-in", defaultDurationMs: 550, distancePx: 12 },
  { id: "pop", label: "Poskočení", phase: "in", effectPreset: "bounce-in", animationPreset: "bounce-in", enterFrom: "down", defaultDurationMs: 650, distancePx: 16 },
  { id: "typewriter", label: "Psací stroj", phase: "in", effectPreset: "type-on-lite", animationPreset: "fade-in", textOnly: true, defaultDurationMs: 900, distancePx: 6 },
];

export const OUT_UI_PRESETS: PhaseUiPresetDef[] = [
  { id: "none", label: "Žádná", phase: "out", effectPreset: "fade-in", animationPreset: "none", defaultDurationMs: 0 },
  { id: "fade-out", label: "Prolnutí pryč", phase: "out", effectPreset: "fade-in", animationPreset: "fade-out", defaultDurationMs: 450 },
  { id: "slide-up-out", label: "Odjede nahoru", phase: "out", effectPreset: "enter-from-top", animationPreset: "slide-up", enterFrom: "up", defaultDurationMs: 500, distancePx: 24 },
  { id: "slide-down-out", label: "Odjede dolů", phase: "out", effectPreset: "enter-from-bottom", animationPreset: "slide-down", enterFrom: "down", defaultDurationMs: 500, distancePx: 24 },
  { id: "slide-left-out", label: "Odjede doleva", phase: "out", effectPreset: "enter-from-left", animationPreset: "slide-in-left", enterFrom: "left", defaultDurationMs: 500, distancePx: 28 },
  { id: "slide-right-out", label: "Odjede doprava", phase: "out", effectPreset: "enter-from-right", animationPreset: "slide-in-right", enterFrom: "right", defaultDurationMs: 500, distancePx: 28 },
  { id: "zoom-out", label: "Oddálení", phase: "out", effectPreset: "zoom-in", animationPreset: "zoom-out", defaultDurationMs: 450, distancePx: 12 },
  { id: "shrink", label: "Zmenšení", phase: "out", effectPreset: "zoom-in", animationPreset: "zoom-out", defaultDurationMs: 400, distancePx: 8 },
];

export const LOOP_UI_PRESETS: PhaseUiPresetDef[] = [
  { id: "none", label: "Žádná", phase: "loop", effectPreset: "float-subtle", animationPreset: "none", defaultDurationMs: 0 },
  { id: "pulse", label: "Pulzování", phase: "loop", effectPreset: "float-subtle", animationPreset: "soft-pulse", defaultDurationMs: 1600, loop: true },
  { id: "float", label: "Jemné plavání", phase: "loop", effectPreset: "float-subtle", animationPreset: "soft-pulse", defaultDurationMs: 2200, loop: true, distancePx: 6 },
  { id: "shake", label: "Zatřesení", phase: "loop", effectPreset: "float-subtle", animationPreset: "soft-pulse", defaultDurationMs: 800, loop: true },
  { id: "glow", label: "Záře", phase: "loop", effectPreset: "word-highlight", animationPreset: "soft-pulse", defaultDurationMs: 1400, loop: true },
  { id: "rotate-slow", label: "Pomalé otočení", phase: "loop", effectPreset: "zoom-rotate-badge", animationPreset: "soft-pulse", defaultDurationMs: 3000, loop: true },
];

export function getPhaseUiPreset(
  phase: LayerEffectPhase,
  uiPresetId: string,
): PhaseUiPresetDef | undefined {
  const list =
    phase === "in"
      ? IN_UI_PRESETS
      : phase === "out"
        ? OUT_UI_PRESETS
        : phase === "loop"
          ? LOOP_UI_PRESETS
          : [];
  return list.find((p) => p.id === uiPresetId);
}

export function phaseUiPresetLabel(phase: LayerEffectPhase, uiPresetId: string): string {
  return getPhaseUiPreset(phase, uiPresetId)?.label ?? uiPresetId;
}

export function inPresetsForLayer(isText: boolean): PhaseUiPresetDef[] {
  return IN_UI_PRESETS.filter((p) => !p.textOnly || isText);
}
