import type { AnimationEasing, AnimationEnterFrom, AnimationPreset, LayerAnimation, LayerEffectPhase } from "@/types/animation";
import { ANIMATION_EASINGS } from "@/types/animation";

export function easingToCss(easing: AnimationEasing): string {
  return ANIMATION_EASINGS.find((e) => e.value === easing)?.css ?? "ease-out";
}

export function presetClassName(layerId: string, replayKey = 0): string {
  const safe = layerId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return replayKey > 0 ? `anim-layer-${safe}-r${replayKey}` : `anim-layer-${safe}`;
}

function slideOffset(enterFrom: AnimationEnterFrom, distancePx: number): string {
  switch (enterFrom) {
    case "left":
      return `translateX(-${distancePx}px)`;
    case "right":
      return `translateX(${distancePx}px)`;
    case "up":
      return `translateY(-${distancePx}px)`;
    case "down":
      return `translateY(${distancePx}px)`;
    default:
      return "translate(0, 0)";
  }
}

function generatePhaseKeyframeCss(
  phase: LayerEffectPhase,
  phaseUiPresetId: string,
  keyframeName: string,
  distancePx: number,
): string | null {
  if (phase === "out") {
    switch (phaseUiPresetId) {
      case "fade-out":
        return `@keyframes ${keyframeName} { from { opacity: 1; } to { opacity: 0; } }`;
      case "slide-up-out":
        return `@keyframes ${keyframeName} { from { opacity: 1; transform: translate(0,0); } to { opacity: 0; transform: translateY(-${distancePx}px); } }`;
      case "slide-down-out":
        return `@keyframes ${keyframeName} { from { opacity: 1; transform: translate(0,0); } to { opacity: 0; transform: translateY(${distancePx}px); } }`;
      case "slide-left-out":
        return `@keyframes ${keyframeName} { from { opacity: 1; transform: translate(0,0); } to { opacity: 0; transform: translateX(-${distancePx}px); } }`;
      case "slide-right-out":
        return `@keyframes ${keyframeName} { from { opacity: 1; transform: translate(0,0); } to { opacity: 0; transform: translateX(${distancePx}px); } }`;
      case "zoom-out":
        return `@keyframes ${keyframeName} { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.7); } }`;
      case "shrink":
        return `@keyframes ${keyframeName} { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.55); } }`;
      default:
        return null;
    }
  }
  if (phase === "loop") {
    switch (phaseUiPresetId) {
      case "pulse":
        return `@keyframes ${keyframeName} { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.04); opacity: 0.92; } }`;
      case "float":
        return `@keyframes ${keyframeName} { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-${Math.max(4, distancePx)}px); } }`;
      case "shake":
        return `@keyframes ${keyframeName} { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-2px); } 75% { transform: translateX(2px); } }`;
      case "glow":
        return `@keyframes ${keyframeName} { 0%, 100% { filter: brightness(1); opacity: 1; } 50% { filter: brightness(1.15); opacity: 0.95; } }`;
      case "rotate-slow":
        return `@keyframes ${keyframeName} { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
      default:
        return null;
    }
  }
  return null;
}

export function generateKeyframeCss(
  anim: Pick<
    LayerAnimation,
    "preset" | "distancePx" | "enterFrom" | "opacityFrom" | "opacityTo" | "scaleFrom" | "scaleTo"
  >,
  keyframeName: string,
): string | null {
  const { preset, distancePx, enterFrom, opacityFrom, opacityTo, scaleFrom, scaleTo } = anim;

  const fromOpacity = opacityFrom;
  const toOpacity = opacityTo;
  const fromScale = scaleFrom;
  const toScale = scaleTo;

  switch (preset) {
    case "none":
      return null;
    case "fade-in":
      return `@keyframes ${keyframeName} { from { opacity: ${fromOpacity}; } to { opacity: ${toOpacity}; } }`;
    case "fade-out":
      return `@keyframes ${keyframeName} { from { opacity: ${toOpacity}; } to { opacity: ${fromOpacity}; } }`;
    case "slide-in-left":
    case "slide-in-right":
    case "slide-up":
    case "slide-down": {
      const offset = slideOffset(enterFrom !== "none" ? enterFrom : preset.includes("left") ? "left" : preset.includes("right") ? "right" : preset.includes("up") ? "up" : "down", distancePx);
      return `@keyframes ${keyframeName} { from { opacity: ${fromOpacity}; transform: ${offset} scale(${fromScale}); } to { opacity: ${toOpacity}; transform: translate(0, 0) scale(${toScale}); } }`;
    }
    case "zoom-in":
      return `@keyframes ${keyframeName} { from { opacity: ${fromOpacity}; transform: scale(${fromScale}); } to { opacity: ${toOpacity}; transform: scale(${toScale}); } }`;
    case "zoom-out":
      return `@keyframes ${keyframeName} { from { opacity: ${fromOpacity}; transform: scale(${Math.max(toScale, 1.15)}); } to { opacity: ${toOpacity}; transform: scale(${toScale}); } }`;
    case "soft-pulse":
      return `@keyframes ${keyframeName} { 0%, 100% { transform: scale(1); opacity: ${toOpacity}; } 50% { transform: scale(${Math.max(toScale, 1.03)}); opacity: ${toOpacity}; } }`;
    case "bounce-in":
      return `@keyframes ${keyframeName} { 0% { opacity: ${fromOpacity}; transform: scale(${fromScale}); } 60% { opacity: ${toOpacity}; transform: scale(${Math.max(toScale, 1.05)}); } 100% { opacity: ${toOpacity}; transform: scale(${toScale}); } }`;
    default:
      return null;
  }
}

export function presetKeyframeName(
  preset: AnimationPreset,
  layerId: string,
  phase?: LayerEffectPhase,
  phaseUiPresetId?: string,
): string {
  const safe = layerId.replace(/[^a-zA-Z0-9_-]/g, "-");
  if (phase && phaseUiPresetId && phase !== "custom") {
    return `kf-${phase}-${phaseUiPresetId}-${safe}`;
  }
  return `kf-${preset}-${safe}`;
}

export function previewKeyframeName(
  preset: AnimationPreset,
  layerId: string,
  replayKey: number,
  phase?: LayerEffectPhase,
  phaseUiPresetId?: string,
): string {
  const safe = layerId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const base =
    phase && phaseUiPresetId && phase !== "custom"
      ? `banner-kf-${phase}-${phaseUiPresetId}-${safe}`
      : `banner-kf-${preset}-${safe}`;
  return replayKey > 0 ? `${base}-r${replayKey}` : base;
}

export function buildLayerAnimationStyle(
  anim: LayerAnimation,
  loop: boolean,
  forExport: boolean,
  replayKey = 0,
): string {
  if (anim.preset === "none" || !anim.enabled) return "";

  const kfName = forExport
    ? presetKeyframeName(anim.preset, anim.layerId, anim.phase, anim.phaseUiPresetId)
    : previewKeyframeName(anim.preset, anim.layerId, replayKey, anim.phase, anim.phaseUiPresetId);

  const isLoopPhase = anim.phase === "loop";
  const iteration =
    isLoopPhase || (anim.preset === "soft-pulse" && loop) ? "infinite" : "1";

  return [
    `animation-name: ${kfName}`,
    `animation-duration: ${anim.durationMs}ms`,
    `animation-delay: ${anim.startMs}ms`,
    `animation-timing-function: ${easingToCss(anim.easing)}`,
    `animation-fill-mode: both`,
    `animation-iteration-count: ${iteration}`,
    `animation-direction: ${anim.direction}`,
  ].join("; ");
}

export function layerAnimGroupClassName(layerId: string, replayKey = 0): string {
  const safe = layerId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return replayKey > 0 ? `anim-group-${safe}-r${replayKey}` : `anim-group-${safe}`;
}

/** Combine in + loop + out animations on one layer element. */
export function buildCombinedLayerAnimationStyle(
  anims: LayerAnimation[],
  loop: boolean,
  forExport: boolean,
  replayKey = 0,
): string {
  const active = anims.filter((a) => a.enabled && a.preset !== "none");
  if (active.length === 0) return "";
  if (active.length === 1) {
    return buildLayerAnimationStyle(active[0]!, loop, forExport, replayKey);
  }

  const names: string[] = [];
  const durations: string[] = [];
  const delays: string[] = [];
  const easings: string[] = [];
  const iterations: string[] = [];
  const directions: string[] = [];

  for (const anim of active) {
    names.push(
      forExport
        ? presetKeyframeName(anim.preset, anim.layerId, anim.phase, anim.phaseUiPresetId)
        : previewKeyframeName(anim.preset, anim.layerId, replayKey, anim.phase, anim.phaseUiPresetId),
    );
    durations.push(`${anim.durationMs}ms`);
    delays.push(`${anim.startMs}ms`);
    easings.push(easingToCss(anim.easing));
    const isLoopPhase = anim.phase === "loop";
    iterations.push(
      isLoopPhase || (anim.preset === "soft-pulse" && loop) ? "infinite" : "1",
    );
    directions.push(anim.direction);
  }

  return [
    `animation-name: ${names.join(", ")}`,
    `animation-duration: ${durations.join(", ")}`,
    `animation-delay: ${delays.join(", ")}`,
    `animation-timing-function: ${easings.join(", ")}`,
    `animation-fill-mode: both`,
    `animation-iteration-count: ${iterations.join(", ")}`,
    `animation-direction: ${directions.join(", ")}`,
  ].join("; ");
}

export function collectLayerKeyframes(
  animations: LayerAnimation[],
  forExport: boolean,
  replayKey = 0,
): string {
  const blocks: string[] = [];
  const seen = new Set<string>();

  for (const anim of animations) {
    if (!anim.enabled || anim.preset === "none") continue;
    const kfName = forExport
      ? presetKeyframeName(anim.preset, anim.layerId, anim.phase, anim.phaseUiPresetId)
      : previewKeyframeName(anim.preset, anim.layerId, replayKey, anim.phase, anim.phaseUiPresetId);

    const phaseKey = kfName;

    if (seen.has(phaseKey)) continue;
    seen.add(phaseKey);

    const phaseCss =
      anim.phase && anim.phaseUiPresetId
        ? generatePhaseKeyframeCss(
            anim.phase,
            anim.phaseUiPresetId,
            kfName,
            anim.distancePx,
          )
        : null;

    if (phaseCss) {
      blocks.push(phaseCss);
      continue;
    }

    const css = generateKeyframeCss(anim, kfName);
    if (css) blocks.push(css);
  }

  return blocks.join("\n");
}

/** @deprecated use collectLayerKeyframes */
export function collectUniqueKeyframes(
  presets: AnimationPreset[],
  distancePx: number,
  forExport: boolean,
): string {
  const dummy: LayerAnimation[] = presets.map((preset, i) => ({
    layerId: `layer-${i}`,
    layerType: "headline",
    enabled: true,
    preset,
    startMs: 0,
    durationMs: 600,
    easing: "ease-out",
    direction: "normal",
    enterFrom: "none",
    distancePx,
    opacityFrom: 0,
    opacityTo: 1,
    scaleFrom: 1,
    scaleTo: 1,
  }));
  return collectLayerKeyframes(dummy, forExport, 0);
}
