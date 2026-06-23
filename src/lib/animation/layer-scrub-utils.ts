import type { CSSProperties } from "react";
import type { BannerEditorState } from "@/types/editor";
import { getLayerById } from "@/lib/animation/storyboard-utils";
import { getLayerPhaseSegments } from "@/lib/animation/layer-phase-utils";
import { getLayerTimelineRange } from "@/lib/animation/layer-timeline-utils";

export interface LayerScrubStyle {
  opacity: number;
  transform: string;
}

function easeOut(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - (1 - c) ** 2;
}

function easeIn(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c ** 2;
}

/** Approximate in/out/loop animation pose at a scene-local scrub time (inline styles, no CSS anim). */
export function getLayerScrubStyle(
  state: BannerEditorState,
  sceneId: string,
  layerId: string,
  localTimeMs: number,
): LayerScrubStyle {
  const layer = getLayerById(state, layerId);
  const baseOpacity = layer?.opacity ?? 1;
  const range = getLayerTimelineRange(state, sceneId, layerId);
  const layerLocal = localTimeMs - range.startMs;
  const segments = getLayerPhaseSegments(state, sceneId, layerId);

  let opacityFactor = 1;
  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  const distance = 24;

  if (segments.in.active && segments.inDurationMs > 0 && layerLocal < segments.inDurationMs) {
    const t = easeOut(layerLocal / segments.inDurationMs);
    switch (segments.in.uiPresetId) {
      case "fade-in":
        opacityFactor = t;
        break;
      case "slide-up":
        translateY = (1 - t) * distance;
        break;
      case "slide-down":
        translateY = -(1 - t) * distance;
        break;
      case "slide-left":
        translateX = (1 - t) * distance;
        break;
      case "slide-right":
        translateX = -(1 - t) * distance;
        break;
      case "zoom-in":
        scale = 0.65 + 0.35 * t;
        opacityFactor = 0.4 + 0.6 * t;
        break;
      case "pop":
        scale = 0.75 + 0.3 * t;
        opacityFactor = t;
        break;
      case "typewriter":
        opacityFactor = t;
        break;
      default:
        opacityFactor = t;
        break;
    }
  }

  const outStart = range.durationMs - segments.outDurationMs;
  if (
    segments.out.active &&
    segments.outDurationMs > 0 &&
    layerLocal >= outStart
  ) {
    const t = easeIn((layerLocal - outStart) / segments.outDurationMs);
    switch (segments.out.uiPresetId) {
      case "fade-out":
        opacityFactor = Math.min(opacityFactor, 1 - t);
        break;
      case "slide-up-out":
        translateY = -t * distance;
        break;
      case "slide-down-out":
        translateY = t * distance;
        break;
      case "slide-left-out":
        translateX = -t * distance;
        break;
      case "slide-right-out":
        translateX = t * distance;
        break;
      case "zoom-out":
        scale = Math.min(scale, 1 - 0.35 * t);
        opacityFactor = Math.min(opacityFactor, 1 - t * 0.8);
        break;
      case "shrink":
        scale = Math.min(scale, 1 - 0.25 * t);
        opacityFactor = Math.min(opacityFactor, 1 - t);
        break;
      default:
        opacityFactor = Math.min(opacityFactor, 1 - t);
        break;
    }
  }

  const loopStart = segments.inDurationMs;
  const loopEnd = range.durationMs - segments.outDurationMs;
  if (
    segments.loopActive &&
    layerLocal >= loopStart &&
    layerLocal < loopEnd &&
    segments.loop.uiPresetId !== "none"
  ) {
    const loopLocal = layerLocal - loopStart;
    switch (segments.loop.uiPresetId) {
      case "pulse":
        scale *= 1 + 0.04 * Math.sin((loopLocal / 800) * Math.PI * 2);
        break;
      case "float":
        translateY += 4 * Math.sin((loopLocal / 1100) * Math.PI * 2);
        break;
      case "shake":
        translateX += 3 * Math.sin((loopLocal / 120) * Math.PI * 2);
        break;
      case "glow":
        opacityFactor *= 0.88 + 0.12 * Math.sin((loopLocal / 700) * Math.PI * 2);
        break;
      case "rotate-slow":
        // rotation handled via transform rotate in caller if needed — skip to avoid fighting layer rotation
        break;
      default:
        break;
    }
  }

  const parts: string[] = [];
  if (translateX !== 0 || translateY !== 0) {
    parts.push(`translate(${translateX}px, ${translateY}px)`);
  }
  if (scale !== 1) {
    parts.push(`scale(${scale})`);
  }

  return {
    opacity: baseOpacity * opacityFactor,
    transform: parts.length > 0 ? parts.join(" ") : "none",
  };
}

export function scrubStyleToCss(style: LayerScrubStyle): Pick<CSSProperties, "opacity" | "transform"> {
  return {
    opacity: style.opacity,
    transform: style.transform === "none" ? undefined : style.transform,
  };
}
