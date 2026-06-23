import {
  buildCombinedLayerAnimationStyle,
  buildLayerAnimationStyle,
  collectLayerKeyframes,
  layerAnimGroupClassName,
  presetClassName,
} from "@/lib/animation/animation-presets";
import {
  badgeFlipKeyframes,
  underlineDrawKeyframes,
  zoomRotateKeyframes,
} from "@/lib/animation/effect-presets";
import { clampParticleCount } from "@/lib/animation/keyframe-utils";
import { buildSceneSequenceCss } from "@/lib/animation/scene-sequence-css";
import {
  getEffectsForScene,
  totalStoryboardDurationMs,
} from "@/lib/animation/storyboard-utils";
import { getTextPlacement } from "@/lib/animation/timeline-utils";
import type { BannerLayer } from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import { sanitizeCssColor } from "./sanitize-export-content";

function buildStoryboardRules(state: BannerEditorState): string {
  const scenes = state.scenes ?? [];
  if (scenes.length <= 1) return buildAnimationRules(state);

  const total = totalStoryboardDurationMs(state);
  const iter = state.timeline?.loop ? "infinite" : 1;
  const sequenceCss = buildSceneSequenceCss(state, 0, state.timeline?.loop ?? false, "scene");
  const sceneClassRules = scenes
    .map(
      (scene) =>
        `.scene-${scene.id} { animation: scene-${scene.id}-0 ${total}ms linear ${iter}; will-change: transform, opacity; }`,
    )
    .join("\n");

  const rules: string[] = [sequenceCss, sceneClassRules, buildAnimationRules(state)];

  for (const scene of scenes) {
    for (const effect of getEffectsForScene(state, scene.id)) {
      if (effect.preset === "flip-180") {
        rules.push(badgeFlipKeyframes(`${effect.layerId}-fx`, effect.durationMs));
      }
      if (effect.preset === "zoom-rotate-badge") {
        rules.push(zoomRotateKeyframes(`${effect.layerId}-fx`, effect.durationMs));
      }
      if (effect.preset === "underline-draw") {
        rules.push(underlineDrawKeyframes(`ul-${effect.layerId}`, effect.durationMs));
      }
    }
  }

  for (const layer of state.bannerLayers ?? []) {
    if (layer.type === "particle") rules.push(particleExportCss(layer));
  }

  return rules.join("\n");
}

function particleExportCss(layer: BannerLayer): string {
  const count = clampParticleCount(layer.particleCount ?? 16);
  const dur = Math.round(2000 / (layer.speed ?? 1));
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(`
@keyframes p-${layer.id}-${i} { 0% { opacity: 0.7; } 100% { transform: translateY(-24px); opacity: 0.1; } }
.p-${layer.id}-${i} { position:absolute; width:3px; height:3px; border-radius:50%; background:#60a5fa; animation: p-${layer.id}-${i} ${dur}ms linear infinite ${(i * 60) % 400}ms; }`);
  }
  return parts.join("\n");
}

function buildAnimationRules(state: BannerEditorState): string {
  const anims = state.layerAnimations ?? [];
  const keyframes = collectLayerKeyframes(anims, true, 0);
  const rules: string[] = keyframes ? [keyframes] : [];
  const grouped = new Map<string, typeof anims>();

  for (const anim of anims) {
    if (!anim.enabled || anim.preset === "none") continue;
    const list = grouped.get(anim.layerId) ?? [];
    list.push(anim);
    grouped.set(anim.layerId, list);
  }

  for (const [layerId, layerAnims] of grouped) {
    const loop = state.timeline?.loop ?? false;
    if (layerAnims.length > 1) {
      const style = buildCombinedLayerAnimationStyle(layerAnims, loop, true, 0);
      if (style) {
        rules.push(`.${layerAnimGroupClassName(layerId, 0)} { ${style} }`);
      }
    } else {
      const anim = layerAnims[0]!;
      const style = buildLayerAnimationStyle(anim, loop, true, 0);
      if (style) {
        rules.push(`.${presetClassName(layerId, 0)} { ${style} }`);
      }
    }
  }

  return rules.join("\n");
}

export function generateBannerCss(state: BannerEditorState): string {
  const bg = sanitizeCssColor(state.backgroundColor, "#0f172a");
  const text = sanitizeCssColor(state.textColor, "#f8fafc");
  const ctaBg = sanitizeCssColor(state.ctaBackgroundColor, "#7c3aed");
  const ctaText = sanitizeCssColor(state.ctaTextColor, "#ffffff");
  const accent = sanitizeCssColor(state.accentColor, "#a78bfa");

  const headlinePl = getTextPlacement(state, "headline");
  const subPl = getTextPlacement(state, "subheadline");
  const ctaPl = getTextPlacement(state, "cta");

  const hasBgImage = (state.assetPlacements ?? []).some(
    (p) => p.visible && p.kind === "background" && (state.assets ?? []).some((a) => a.id === p.assetId),
  );

  const bannerBg = hasBgImage ? "transparent" : bg;
  const animationBlock = buildStoryboardRules(state);

  return `*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: ${state.width}px;
  height: ${state.height}px;
  overflow: hidden;
}
body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: ${bg};
  color: ${text};
}
.banner {
  position: relative;
  width: ${state.width}px;
  height: ${state.height}px;
  overflow: hidden;
  background: ${bannerBg};
  color: ${text};
}
.layer {
  position: absolute;
  overflow: hidden;
  transform-origin: center center;
}
.layer--background { pointer-events: none; }
.layer__img {
  display: block;
  width: 100%;
  height: 100%;
}
.layer__img--contain { object-fit: contain; }
.layer__img--cover { object-fit: cover; }
.layer__img--fill { object-fit: fill; }
.layer--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed ${accent};
  color: ${accent};
  font-size: 9px;
  text-align: center;
  background: ${bg};
}
.layer--headline {
  margin: 0;
  font-size: ${headlinePl?.fontSize ?? 16}px;
  line-height: ${headlinePl?.lineHeight ?? 1.15};
  font-weight: ${headlinePl?.fontWeight ?? 700};
  text-align: ${headlinePl?.textAlign ?? "left"};
  display: flex;
  align-items: center;
  justify-content: ${headlinePl?.textAlign === "center" ? "center" : headlinePl?.textAlign === "right" ? "flex-end" : "flex-start"};
}
.layer--subheadline {
  margin: 0;
  font-size: ${subPl?.fontSize ?? 11}px;
  line-height: ${subPl?.lineHeight ?? 1.25};
  font-weight: ${subPl?.fontWeight ?? 400};
  text-align: ${subPl?.textAlign ?? "left"};
  display: flex;
  align-items: center;
  justify-content: ${subPl?.textAlign === "center" ? "center" : subPl?.textAlign === "right" ? "flex-end" : "flex-start"};
}
.layer--underline {
  transform-origin: left center;
}
.scene-layer {
  position: absolute;
  inset: 0;
}
.layer--cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 4px;
  background: ${ctaBg};
  color: ${ctaText};
  font-size: ${ctaPl?.fontSize ?? 11}px;
  font-weight: ${ctaPl?.fontWeight ?? 600};
  line-height: ${ctaPl?.lineHeight ?? 1.2};
  text-align: ${ctaPl?.textAlign ?? "center"};
}
${animationBlock}`;
}
