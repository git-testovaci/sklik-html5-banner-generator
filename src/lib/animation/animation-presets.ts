import type { AnimationEasing, AnimationPreset } from "@/types/animation";
import { ANIMATION_EASINGS } from "@/types/animation";

export function easingToCss(easing: AnimationEasing): string {
  return ANIMATION_EASINGS.find((e) => e.value === easing)?.css ?? "ease-out";
}

export function presetClassName(layerId: string): string {
  const safe = layerId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `anim-layer-${safe}`;
}

export function generateKeyframeCss(preset: AnimationPreset, distancePx: number): string | null {
  switch (preset) {
    case "none":
      return null;
    case "fade-in":
      return `@keyframes kf-fade-in { from { opacity: 0; } to { opacity: 1; } }`;
    case "fade-out":
      return `@keyframes kf-fade-out { from { opacity: 1; } to { opacity: 0; } }`;
    case "slide-in-left":
      return `@keyframes kf-slide-in-left { from { opacity: 0; transform: translateX(-${distancePx}px); } to { opacity: 1; transform: translateX(0); } }`;
    case "slide-in-right":
      return `@keyframes kf-slide-in-right { from { opacity: 0; transform: translateX(${distancePx}px); } to { opacity: 1; transform: translateX(0); } }`;
    case "slide-up":
      return `@keyframes kf-slide-up { from { opacity: 0; transform: translateY(${distancePx}px); } to { opacity: 1; transform: translateY(0); } }`;
    case "slide-down":
      return `@keyframes kf-slide-down { from { opacity: 0; transform: translateY(-${distancePx}px); } to { opacity: 1; transform: translateY(0); } }`;
    case "zoom-in":
      return `@keyframes kf-zoom-in { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }`;
    case "zoom-out":
      return `@keyframes kf-zoom-out { from { opacity: 0; transform: scale(1.15); } to { opacity: 1; transform: scale(1); } }`;
    case "soft-pulse":
      return `@keyframes kf-soft-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }`;
    case "bounce-in":
      return `@keyframes kf-bounce-in { 0% { opacity: 0; transform: scale(0.8); } 60% { opacity: 1; transform: scale(1.05); } 100% { transform: scale(1); } }`;
    default:
      return null;
  }
}

export function presetKeyframeName(preset: AnimationPreset): string | null {
  const map: Partial<Record<AnimationPreset, string>> = {
    "fade-in": "kf-fade-in",
    "fade-out": "kf-fade-out",
    "slide-in-left": "kf-slide-in-left",
    "slide-in-right": "kf-slide-in-right",
    "slide-up": "kf-slide-up",
    "slide-down": "kf-slide-down",
    "zoom-in": "kf-zoom-in",
    "zoom-out": "kf-zoom-out",
    "soft-pulse": "kf-soft-pulse",
    "bounce-in": "kf-bounce-in",
  };
  return map[preset] ?? null;
}

export function previewKeyframeName(preset: AnimationPreset): string {
  return `banner-kf-${preset}`;
}

export function generatePreviewKeyframeCss(
  preset: AnimationPreset,
  distancePx: number,
): string | null {
  const css = generateKeyframeCss(preset, distancePx);
  if (!css) return null;
  return css.replace(/@keyframes kf-/g, "@keyframes banner-kf-");
}

export function buildLayerAnimationStyle(
  preset: AnimationPreset,
  startMs: number,
  durationMs: number,
  easing: AnimationEasing,
  loop: boolean,
  distancePx: number,
  forExport: boolean,
): string {
  if (preset === "none") return "";

  const kfName = forExport
    ? presetKeyframeName(preset)
    : previewKeyframeName(preset);
  if (!kfName) return "";

  const iteration = preset === "soft-pulse" && loop ? "infinite" : "1";
  const fill = preset === "soft-pulse" ? "both" : "both";

  return [
    `animation-name: ${kfName}`,
    `animation-duration: ${durationMs}ms`,
    `animation-delay: ${startMs}ms`,
    `animation-timing-function: ${easingToCss(easing)}`,
    `animation-fill-mode: ${fill}`,
    `animation-iteration-count: ${iteration}`,
  ].join("; ");
}

export function collectUniqueKeyframes(
  presets: AnimationPreset[],
  distancePx: number,
  forExport: boolean,
): string {
  const seen = new Set<string>();
  const blocks: string[] = [];

  for (const preset of presets) {
    if (preset === "none" || seen.has(preset)) continue;
    seen.add(preset);
    const css = forExport
      ? generateKeyframeCss(preset, distancePx)
      : generatePreviewKeyframeCss(preset, distancePx);
    if (css) blocks.push(css);
  }

  return blocks.join("\n");
}
