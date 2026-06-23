import type { AnimationEasing, AnimationEnterFrom, AnimationPreset, LayerAnimation } from "@/types/animation";
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

export function presetKeyframeName(preset: AnimationPreset, layerId: string): string {
  const safe = layerId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `kf-${preset}-${safe}`;
}

export function previewKeyframeName(preset: AnimationPreset, layerId: string, replayKey: number): string {
  const safe = layerId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return replayKey > 0 ? `banner-kf-${preset}-${safe}-r${replayKey}` : `banner-kf-${preset}-${safe}`;
}

export function buildLayerAnimationStyle(
  anim: LayerAnimation,
  loop: boolean,
  forExport: boolean,
  replayKey = 0,
): string {
  if (anim.preset === "none" || !anim.enabled) return "";

  const kfName = forExport
    ? presetKeyframeName(anim.preset, anim.layerId)
    : previewKeyframeName(anim.preset, anim.layerId, replayKey);

  const iteration =
    anim.preset === "soft-pulse" && loop ? "infinite" : "1";

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
      ? presetKeyframeName(anim.preset, anim.layerId)
      : previewKeyframeName(anim.preset, anim.layerId, replayKey);
    if (seen.has(kfName)) continue;
    seen.add(kfName);
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
