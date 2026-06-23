import {
  buildLayerAnimationStyle,
  collectLayerKeyframes,
  presetClassName,
} from "@/lib/animation/animation-presets";
import { getTextPlacement } from "@/lib/animation/timeline-utils";
import type { BannerEditorState } from "@/types/editor";
import { sanitizeCssColor } from "./sanitize-export-content";

function buildAnimationRules(state: BannerEditorState): string {
  const anims = state.layerAnimations ?? [];
  const keyframes = collectLayerKeyframes(anims, true, 0);
  const rules: string[] = keyframes ? [keyframes] : [];

  for (const anim of anims) {
    if (!anim.enabled || anim.preset === "none") continue;
    const style = buildLayerAnimationStyle(
      anim,
      state.timeline?.loop ?? false,
      true,
      0,
    );
    if (style) {
      rules.push(`.${presetClassName(anim.layerId, 0)} { ${style} }`);
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
