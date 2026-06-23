import type { TemplateAssetSlotKind } from "./template-slots";

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

export type AnimationEnterFrom = "none" | "left" | "right" | "up" | "down";

export type LayerType =
  | "headline"
  | "subheadline"
  | "cta"
  | "logo"
  | "product"
  | "background"
  | "decoration";

export type BannerSceneTransition =
  | "none"
  | "fade"
  | "swipe-left"
  | "swipe-right"
  | "swipe-up"
  | "swipe-down"
  | "push-left"
  | "push-right";

export type BannerLayerType =
  | "text"
  | "image"
  | "shape"
  | "particle"
  | "underline"
  | "badge";

export type ParticleMode =
  | "dust-to-clean"
  | "floating-dots"
  | "air-flow"
  | "sparkle";

export type ShapeType = "rectangle" | "circle" | "pill" | "line";

export type EffectPreset =
  | "enter-from-top"
  | "enter-from-bottom"
  | "enter-from-left"
  | "enter-from-right"
  | "fade-in"
  | "line-by-line-reveal"
  | "word-highlight"
  | "underline-draw"
  | "type-on-lite"
  | "slight-drop-in"
  | "slide-in-left"
  | "slide-in-right"
  | "zoom-in"
  | "zoom-rotate-in"
  | "flip-in-y"
  | "product-stagger"
  | "float-subtle"
  | "scene-swipe-left"
  | "scene-swipe-right"
  | "scene-fade"
  | "scene-push-left"
  | "dust-to-clean"
  | "air-particles"
  | "floating-clean-dots"
  | "flip-180"
  | "zoom-rotate-badge"
  | "bounce-in";

export interface BannerTimeline {
  durationMs: number;
  loop: boolean;
  backgroundAnimation: AnimationPreset;
}

export interface BannerScene {
  id: string;
  name: string;
  durationMs: number;
  transitionIn: BannerSceneTransition;
  transitionOut: BannerSceneTransition;
  /** Duration of transitionOut animation in ms (default 700) */
  transitionDurationMs?: number;
  backgroundColor?: string;
  layerIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BannerLayerBase {
  id: string;
  sceneId?: string;
  persistent: boolean;
  name: string;
  type: BannerLayerType;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

export interface BannerLayer extends BannerLayerBase {
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  textAlign?: "left" | "center" | "right";
  color?: string;
  highlightWord?: string;
  underlineWord?: string;
  assetId?: string;
  fit?: "contain" | "cover" | "fill";
  borderRadius?: number;
  shadow?: boolean;
  shapeType?: ShapeType;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  particleMode?: ParticleMode;
  particleCount?: number;
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
  colors?: string[];
  speed?: number;
  spread?: number;
  particleLoop?: boolean;
  targetTextLayerId?: string;
  underlineColor?: string;
  thickness?: number;
  drawDurationMs?: number;
  offsetY?: number;
  /** Maps to legacy text layer id or asset kind */
  legacyKey?: string;
  /** Template replaceable asset slot (editor-only metadata) */
  slotId?: string;
  slotKind?: TemplateAssetSlotKind;
  slotLabel?: string;
  isTemplateSlot?: boolean;
  /** Optional editor timeline window when layer has no layerEffects */
  timelineStartMs?: number;
  timelineDurationMs?: number;
}

export interface LayerKeyframe {
  id: string;
  layerId: string;
  sceneId: string;
  timeMs: number;
  x?: number;
  y?: number;
  opacity?: number;
  rotation?: number;
  scale?: number;
  width?: number;
  height?: number;
  easing: AnimationEasing;
}

export interface LayerEffect {
  id: string;
  layerId: string;
  sceneId: string;
  preset: EffectPreset;
  startMs: number;
  durationMs: number;
  easing: AnimationEasing;
  direction: "normal" | "reverse" | "alternate";
  distancePx: number;
  intensity: number;
  loop: boolean;
  params?: Record<string, string | number | boolean>;
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
  enterFrom: AnimationEnterFrom;
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

export const SCENE_TRANSITIONS: readonly {
  value: BannerSceneTransition;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "swipe-left", label: "Swipe left" },
  { value: "swipe-right", label: "Swipe right" },
  { value: "swipe-up", label: "Swipe up" },
  { value: "swipe-down", label: "Swipe down" },
  { value: "push-left", label: "Push left" },
  { value: "push-right", label: "Push right" },
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

export const ANIMATION_ENTER_FROM: readonly {
  value: AnimationEnterFrom;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "up", label: "Top" },
  { value: "down", label: "Bottom" },
] as const;

export function presetDefaultEnterFrom(preset: AnimationPreset): AnimationEnterFrom {
  switch (preset) {
    case "slide-in-left":
      return "left";
    case "slide-in-right":
      return "right";
    case "slide-up":
      return "up";
    case "slide-down":
      return "down";
    default:
      return "none";
  }
}
