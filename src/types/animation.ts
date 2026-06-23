export type AnimationPreset =
  | "none"
  | "fade-in"
  | "fade-out"
  | "slide-in-left"
  | "slide-in-right"
  | "slide-up"
  | "slide-down"
  | "zoom-in"
  | "zoom-out"
  | "soft-pulse"
  | "bounce-in";

export type AnimationEasing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "cubic-soft";

export type LayerType =
  | "headline"
  | "subheadline"
  | "cta"
  | "logo"
  | "product"
  | "background"
  | "decoration";

export interface BannerTimeline {
  durationMs: number;
  loop: boolean;
  backgroundAnimation: AnimationPreset;
}

export interface LayerAnimation {
  layerId: string;
  layerType: LayerType;
  enabled: boolean;
  preset: AnimationPreset;
  startMs: number;
  durationMs: number;
  easing: AnimationEasing;
  direction: "normal" | "reverse" | "alternate";
  distancePx: number;
  opacityFrom: number;
  opacityTo: number;
  scaleFrom: number;
  scaleTo: number;
}

export const ANIMATION_PRESETS: readonly {
  value: AnimationPreset;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "fade-in", label: "Fade in" },
  { value: "fade-out", label: "Fade out" },
  { value: "slide-in-left", label: "Slide in left" },
  { value: "slide-in-right", label: "Slide in right" },
  { value: "slide-up", label: "Slide up" },
  { value: "slide-down", label: "Slide down" },
  { value: "zoom-in", label: "Zoom in" },
  { value: "zoom-out", label: "Zoom out" },
  { value: "soft-pulse", label: "Soft pulse" },
  { value: "bounce-in", label: "Bounce in" },
] as const;

export const ANIMATION_EASINGS: readonly {
  value: AnimationEasing;
  label: string;
  css: string;
}[] = [
  { value: "linear", label: "Linear", css: "linear" },
  { value: "ease", label: "Ease", css: "ease" },
  { value: "ease-in", label: "Ease in", css: "ease-in" },
  { value: "ease-out", label: "Ease out", css: "ease-out" },
  { value: "ease-in-out", label: "Ease in-out", css: "ease-in-out" },
  { value: "cubic-soft", label: "Soft cubic", css: "cubic-bezier(0.4, 0, 0.2, 1)" },
] as const;
