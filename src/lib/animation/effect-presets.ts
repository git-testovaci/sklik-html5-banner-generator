import type {
  AnimationEasing,
  AnimationEnterFrom,
  AnimationPreset,
  EffectPreset,
  LayerAnimation,
  LayerEffect,
  LayerType,
} from "@/types/animation";
import { presetDefaultEnterFrom } from "@/types/animation";

export interface EffectPresetConfig {
  label: string;
  category: "text" | "image" | "scene" | "particle" | "badge";
  startMs: number;
  durationMs: number;
  easing: AnimationEasing;
  distancePx: number;
  intensity: number;
  loop: boolean;
  animationPreset: AnimationPreset;
  enterFrom: AnimationEnterFrom;
}

const CONFIGS: Record<EffectPreset, EffectPresetConfig> = {
  "enter-from-top": {
    label: "Enter from top",
    category: "text",
    startMs: 0,
    durationMs: 700,
    easing: "ease-out",
    distancePx: 24,
    intensity: 1,
    loop: false,
    animationPreset: "slide-down",
    enterFrom: "up",
  },
  "enter-from-bottom": {
    label: "Enter from bottom",
    category: "text",
    startMs: 0,
    durationMs: 700,
    easing: "ease-out",
    distancePx: 24,
    intensity: 1,
    loop: false,
    animationPreset: "slide-up",
    enterFrom: "down",
  },
  "enter-from-left": {
    label: "Enter from left",
    category: "text",
    startMs: 0,
    durationMs: 700,
    easing: "ease-out",
    distancePx: 24,
    intensity: 1,
    loop: false,
    animationPreset: "slide-in-left",
    enterFrom: "left",
  },
  "enter-from-right": {
    label: "Enter from right",
    category: "text",
    startMs: 0,
    durationMs: 700,
    easing: "ease-out",
    distancePx: 24,
    intensity: 1,
    loop: false,
    animationPreset: "slide-in-right",
    enterFrom: "right",
  },
  "fade-in": {
    label: "Fade in",
    category: "text",
    startMs: 0,
    durationMs: 600,
    easing: "ease-out",
    distancePx: 8,
    intensity: 1,
    loop: false,
    animationPreset: "fade-in",
    enterFrom: "none",
  },
  "line-by-line-reveal": {
    label: "Line reveal",
    category: "text",
    startMs: 0,
    durationMs: 800,
    easing: "ease-out",
    distancePx: 12,
    intensity: 1,
    loop: false,
    animationPreset: "fade-in",
    enterFrom: "up",
  },
  "word-highlight": {
    label: "Word highlight",
    category: "text",
    startMs: 200,
    durationMs: 600,
    easing: "ease-out",
    distancePx: 0,
    intensity: 1,
    loop: false,
    animationPreset: "soft-pulse",
    enterFrom: "none",
  },
  "underline-draw": {
    label: "Draw underline",
    category: "text",
    startMs: 400,
    durationMs: 600,
    easing: "ease-out",
    distancePx: 0,
    intensity: 1,
    loop: false,
    animationPreset: "fade-in",
    enterFrom: "none",
  },
  "type-on-lite": {
    label: "Type on",
    category: "text",
    startMs: 0,
    durationMs: 900,
    easing: "ease-out",
    distancePx: 6,
    intensity: 1,
    loop: false,
    animationPreset: "fade-in",
    enterFrom: "none",
  },
  "slight-drop-in": {
    label: "Drop in",
    category: "text",
    startMs: 0,
    durationMs: 650,
    easing: "cubic-soft",
    distancePx: 18,
    intensity: 1,
    loop: false,
    animationPreset: "slide-down",
    enterFrom: "up",
  },
  "slide-in-left": {
    label: "Slide in left",
    category: "image",
    startMs: 200,
    durationMs: 700,
    easing: "ease-out",
    distancePx: 32,
    intensity: 1,
    loop: false,
    animationPreset: "slide-in-left",
    enterFrom: "left",
  },
  "slide-in-right": {
    label: "Slide in right",
    category: "image",
    startMs: 200,
    durationMs: 700,
    easing: "ease-out",
    distancePx: 32,
    intensity: 1,
    loop: false,
    animationPreset: "slide-in-right",
    enterFrom: "right",
  },
  "zoom-in": {
    label: "Zoom in",
    category: "image",
    startMs: 150,
    durationMs: 700,
    easing: "ease-out",
    distancePx: 12,
    intensity: 1,
    loop: false,
    animationPreset: "zoom-in",
    enterFrom: "none",
  },
  "zoom-rotate-in": {
    label: "Zoom rotate in",
    category: "image",
    startMs: 0,
    durationMs: 800,
    easing: "cubic-soft",
    distancePx: 16,
    intensity: 1,
    loop: false,
    animationPreset: "zoom-in",
    enterFrom: "none",
  },
  "flip-in-y": {
    label: "Flip in Y",
    category: "image",
    startMs: 0,
    durationMs: 700,
    easing: "ease-out",
    distancePx: 0,
    intensity: 1,
    loop: false,
    animationPreset: "bounce-in",
    enterFrom: "none",
  },
  "product-stagger": {
    label: "Product stagger",
    category: "image",
    startMs: 0,
    durationMs: 600,
    easing: "ease-out",
    distancePx: 20,
    intensity: 1,
    loop: false,
    animationPreset: "slide-in-left",
    enterFrom: "left",
  },
  "float-subtle": {
    label: "Float subtle",
    category: "image",
    startMs: 0,
    durationMs: 2000,
    easing: "ease-in-out",
    distancePx: 6,
    intensity: 0.5,
    loop: true,
    animationPreset: "soft-pulse",
    enterFrom: "none",
  },
  "scene-swipe-left": {
    label: "Scene swipe left",
    category: "scene",
    startMs: 0,
    durationMs: 500,
    easing: "ease-out",
    distancePx: 100,
    intensity: 1,
    loop: false,
    animationPreset: "none",
    enterFrom: "left",
  },
  "scene-swipe-right": {
    label: "Scene swipe right",
    category: "scene",
    startMs: 0,
    durationMs: 500,
    easing: "ease-out",
    distancePx: 100,
    intensity: 1,
    loop: false,
    animationPreset: "none",
    enterFrom: "right",
  },
  "scene-fade": {
    label: "Scene fade",
    category: "scene",
    startMs: 0,
    durationMs: 400,
    easing: "ease-out",
    distancePx: 0,
    intensity: 1,
    loop: false,
    animationPreset: "fade-in",
    enterFrom: "none",
  },
  "scene-push-left": {
    label: "Scene push left",
    category: "scene",
    startMs: 0,
    durationMs: 500,
    easing: "ease-out",
    distancePx: 100,
    intensity: 1,
    loop: false,
    animationPreset: "none",
    enterFrom: "left",
  },
  "dust-to-clean": {
    label: "Dust to clean",
    category: "particle",
    startMs: 0,
    durationMs: 2000,
    easing: "linear",
    distancePx: 40,
    intensity: 1,
    loop: true,
    animationPreset: "none",
    enterFrom: "none",
  },
  "air-particles": {
    label: "Air particles",
    category: "particle",
    startMs: 0,
    durationMs: 3000,
    easing: "linear",
    distancePx: 60,
    intensity: 1,
    loop: true,
    animationPreset: "none",
    enterFrom: "none",
  },
  "floating-clean-dots": {
    label: "Floating dots",
    category: "particle",
    startMs: 0,
    durationMs: 2500,
    easing: "ease-in-out",
    distancePx: 20,
    intensity: 0.7,
    loop: true,
    animationPreset: "none",
    enterFrom: "none",
  },
  "flip-180": {
    label: "Flip 180°",
    category: "badge",
    startMs: 200,
    durationMs: 700,
    easing: "ease-out",
    distancePx: 0,
    intensity: 1,
    loop: false,
    animationPreset: "bounce-in",
    enterFrom: "none",
  },
  "zoom-rotate-badge": {
    label: "Zoom rotate badge",
    category: "badge",
    startMs: 0,
    durationMs: 800,
    easing: "cubic-soft",
    distancePx: 0,
    intensity: 1,
    loop: false,
    animationPreset: "zoom-in",
    enterFrom: "none",
  },
  "bounce-in": {
    label: "Bounce in",
    category: "badge",
    startMs: 0,
    durationMs: 700,
    easing: "ease-out",
    distancePx: 16,
    intensity: 1,
    loop: false,
    animationPreset: "bounce-in",
    enterFrom: "down",
  },
};

export function effectPresetDefaults(preset: EffectPreset): EffectPresetConfig {
  return CONFIGS[preset];
}

export function effectToLayerAnimation(
  effect: LayerEffect,
  layerType: LayerType,
): LayerAnimation {
  const cfg = CONFIGS[effect.preset];
  return {
    layerId: effect.layerId,
    layerType,
    enabled: true,
    preset: cfg.animationPreset,
    startMs: effect.startMs,
    durationMs: effect.durationMs,
    easing: effect.easing,
    direction: effect.direction,
    enterFrom: cfg.enterFrom ?? presetDefaultEnterFrom(cfg.animationPreset),
    distancePx: effect.distancePx,
    opacityFrom: cfg.animationPreset === "fade-in" ? 0 : 1,
    opacityTo: 1,
    scaleFrom: cfg.animationPreset === "zoom-in" ? 0.6 : 1,
    scaleTo: 1,
  };
}

export function sceneEffectToTransition(
  preset: EffectPreset,
): "none" | "fade" | "swipe-left" | "swipe-right" | "push-left" {
  switch (preset) {
    case "scene-swipe-left":
      return "swipe-left";
    case "scene-swipe-right":
      return "swipe-right";
    case "scene-fade":
      return "fade";
    case "scene-push-left":
      return "push-left";
    default:
      return "none";
  }
}

export const QUICK_EFFECTS: readonly {
  id: string;
  label: string;
  preset: EffectPreset;
  target: "layer" | "scene" | "products";
}[] = [
  { id: "text-drop", label: "Text drops in", preset: "slight-drop-in", target: "layer" },
  { id: "underline", label: "Draw underline", preset: "underline-draw", target: "layer" },
  { id: "product-slide", label: "Product slides in", preset: "slide-in-left", target: "layer" },
  { id: "particles", label: "Particles flow", preset: "dust-to-clean", target: "layer" },
  { id: "badge-flip", label: "Badge flips", preset: "flip-180", target: "layer" },
  { id: "zoom-rotate", label: "Circle zoom rotate", preset: "zoom-rotate-badge", target: "layer" },
  { id: "swipe-left", label: "Scene swipe left", preset: "scene-swipe-left", target: "scene" },
  { id: "swipe-right", label: "Scene swipe right", preset: "scene-swipe-right", target: "scene" },
  { id: "stagger", label: "Stagger products", preset: "product-stagger", target: "products" },
];

export function underlineDrawKeyframes(className: string, durationMs: number): string {
  return `
@keyframes ${className}Underline {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
.${className} {
  transform-origin: left center;
  animation: ${className}Underline ${durationMs}ms ease-out forwards;
}`;
}

export function badgeFlipKeyframes(className: string, durationMs: number): string {
  return `
@keyframes ${className}Flip {
  from { transform: perspective(400px) rotateY(120deg) scale(0.5); opacity: 0; }
  to { transform: perspective(400px) rotateY(0deg) scale(1); opacity: 1; }
}
.${className} {
  animation: ${className}Flip ${durationMs}ms ease-out forwards;
}`;
}

export function zoomRotateKeyframes(className: string, durationMs: number): string {
  return `
@keyframes ${className}ZoomRot {
  from { transform: rotate(120deg) scale(0.3); opacity: 0; }
  to { transform: rotate(0deg) scale(1); opacity: 1; }
}
.${className} {
  animation: ${className}ZoomRot ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}`;
}
