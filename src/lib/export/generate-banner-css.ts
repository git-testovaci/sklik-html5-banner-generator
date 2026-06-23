import {
  buildLayerAnimationStyle,
  collectUniqueKeyframes,
  presetClassName,
} from "@/lib/animation/animation-presets";
import type { BannerEditorState } from "@/types/editor";
import { sanitizeCssColor } from "./sanitize-export-content";

function fontSize(width: number, height: number, base: number): string {
  const scale = Math.min(width, height) / 300;
  return `${Math.max(8, Math.round(base * scale))}px`;
}

function buildAnimationRules(state: BannerEditorState): string {
  const anims = state.layerAnimations ?? [];
  const presets = anims
    .filter((a) => a.enabled && a.preset !== "none")
    .map((a) => a.preset);

  const keyframes = collectUniqueKeyframes(presets, 12, true);
  const rules: string[] = [];

  if (keyframes) rules.push(keyframes);

  for (const anim of anims) {
    if (!anim.enabled || anim.preset === "none") continue;
    const style = buildLayerAnimationStyle(
      anim.preset,
      anim.startMs,
      anim.durationMs,
      anim.easing,
      state.timeline?.loop ?? false,
      anim.distancePx,
      true,
    );
    if (style) {
      rules.push(`.${presetClassName(anim.layerId)} { ${style} }`);
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

  const headlineSize = fontSize(state.width, state.height, 16);
  const subSize = fontSize(state.width, state.height, 11);
  const ctaSize = fontSize(state.width, state.height, 11);
  const labelSize = fontSize(state.width, state.height, 9);

  const hasBgImage = (state.assetPlacements ?? []).some(
    (p) => p.visible && p.kind === "background" && (state.assets ?? []).some((a) => a.id === p.assetId),
  );

  const bannerBg = hasBgImage ? "transparent" : bg;

  const animationBlock = buildAnimationRules(state);

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
  font-size: ${labelSize};
  text-align: center;
  background: ${bg};
}
.layer--headline {
  margin: 0;
  font-size: ${headlineSize};
  line-height: 1.15;
  font-weight: 700;
  display: flex;
  align-items: center;
}
.layer--subheadline {
  margin: 0;
  font-size: ${subSize};
  line-height: 1.25;
  opacity: 0.9;
  display: flex;
  align-items: center;
}
.layer--cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: 4px;
  background: ${ctaBg};
  color: ${ctaText};
  font-size: ${ctaSize};
  font-weight: 600;
  line-height: 1.2;
}
${animationBlock}`;
}
