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
import { getEffectsForScene } from "@/lib/animation/storyboard-utils";
import type { BannerLayer } from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import {
  collectExportLayerAnimations,
  collectExportVisibilityCss,
  getExportLayersForScene,
  isLegacyFlatScene,
  projectHasBackgroundImage,
  resolveExportLayerTextStyle,
  resolveExportScenes,
  type ExportLayerTextStyle,
} from "./export-layer-utils";
import { sanitizeCssColor } from "./sanitize-export-content";
import { totalStoryboardDurationMs } from "@/lib/animation/storyboard-utils";

function buildStoryboardRules(state: BannerEditorState): string {
  const scenes = resolveExportScenes(state);
  const realScenes = state.scenes ?? [];
  const multiScene = scenes.length > 1 && !isLegacyFlatScene(scenes[0]!.id);

  const rules: string[] = [];

  if (multiScene && realScenes.length > 1) {
    const total = totalStoryboardDurationMs(state);
    const iter = state.timeline?.loop ? "infinite" : 1;
    rules.push(buildSceneSequenceCss(state, 0, state.timeline?.loop ?? false, "scene"));
    rules.push(
      ...realScenes.map(
        (scene) =>
          `.scene-${scene.id} { animation: scene-${scene.id}-0 ${total}ms linear ${iter}; will-change: transform, opacity; }`,
      ),
    );
  }

  rules.push(buildAnimationRules(state));

  for (const scene of scenes) {
    const effectSceneId = isLegacyFlatScene(scene.id)
      ? realScenes[0]?.id ?? scene.id
      : scene.id;
    if (isLegacyFlatScene(effectSceneId)) continue;
    for (const effect of getEffectsForScene(state, effectSceneId)) {
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

  for (const scene of scenes) {
    for (const layer of getExportLayersForScene(state, scene.id)) {
      if (layer.type === "particle") rules.push(particleExportCss(layer));
    }
  }

  const visCss = collectExportVisibilityCss(state);
  if (visCss) rules.push(visCss);

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
  const anims = collectExportLayerAnimations(state);
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

function flexJustifyContent(textAlign: ExportLayerTextStyle["textAlign"]): string {
  return textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start";
}

function cssEscapeAttrValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function headlineClassCss(style: ExportLayerTextStyle): string {
  return `margin: 0;
  font-size: ${style.fontSize}px;
  line-height: ${style.lineHeight};
  font-weight: ${style.fontWeight};
  text-align: ${style.textAlign};
  display: flex;
  align-items: center;
  justify-content: ${flexJustifyContent(style.textAlign)};`;
}

function subheadlineClassCss(style: ExportLayerTextStyle): string {
  return headlineClassCss(style);
}

function ctaClassCss(style: ExportLayerTextStyle, ctaBg: string, ctaText: string): string {
  const bg = style.backgroundColor ? sanitizeCssColor(style.backgroundColor, ctaBg) : ctaBg;
  const color = style.color ? sanitizeCssColor(style.color, ctaText) : ctaText;
  const paddingY = style.paddingY ?? 4;
  const paddingX = style.paddingX ?? 10;
  return `display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${paddingY}px ${paddingX}px;
  border-radius: ${style.borderRadius ?? 4}px;
  background: ${bg};
  color: ${color};
  font-size: ${style.fontSize}px;
  font-weight: ${style.fontWeight};
  line-height: ${style.lineHeight};
  text-align: ${style.textAlign};`;
}

function genericTextLayerCss(style: ExportLayerTextStyle, textColor: string): string {
  const color = style.color ? sanitizeCssColor(style.color, textColor) : textColor;
  return `margin: 0;
  font-size: ${style.fontSize}px;
  line-height: ${style.lineHeight};
  font-weight: ${style.fontWeight};
  text-align: ${style.textAlign};
  color: ${color};
  display: flex;
  align-items: center;
  justify-content: ${flexJustifyContent(style.textAlign)};`;
}

function legacyStyleFromScene(
  state: BannerEditorState,
  sceneId: string,
  legacyKey: "headline" | "subheadline" | "cta",
): ExportLayerTextStyle {
  const layer = getExportLayersForScene(state, sceneId).find(
    (l) => l.type === "text" && l.legacyKey === legacyKey,
  );
  if (layer) {
    return resolveExportLayerTextStyle(state, sceneId, layer);
  }
  return resolveExportLayerTextStyle(state, sceneId, {
    id: legacyKey,
    type: "text",
    legacyKey,
    name: legacyKey,
    visible: true,
    locked: false,
    persistent: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: 0,
  });
}

function buildGlobalLegacyTextClassRules(
  state: BannerEditorState,
  sceneId: string,
  ctaBg: string,
  ctaText: string,
): string {
  const headlineStyle = legacyStyleFromScene(state, sceneId, "headline");
  const subStyle = legacyStyleFromScene(state, sceneId, "subheadline");
  const ctaStyle = legacyStyleFromScene(state, sceneId, "cta");

  return `.layer--headline {
  ${headlineClassCss(headlineStyle)}
}
.layer--subheadline {
  ${subheadlineClassCss(subStyle)}
}
.layer--cta {
  ${ctaClassCss(ctaStyle, ctaBg, ctaText)}
}`;
}

function buildMultiSceneTextStyleRules(
  state: BannerEditorState,
  textColor: string,
  ctaBg: string,
  ctaText: string,
): string {
  const rules: string[] = [];
  const realScenes = state.scenes ?? [];

  rules.push(`.layer--headline {
  margin: 0;
  display: flex;
  align-items: center;
}
.layer--subheadline {
  margin: 0;
  display: flex;
  align-items: center;
}
.layer--cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.layer--text {
  margin: 0;
  display: flex;
  align-items: center;
}`);

  for (const scene of realScenes) {
    for (const layer of getExportLayersForScene(state, scene.id)) {
      if (layer.type !== "text") continue;
      const style = resolveExportLayerTextStyle(state, scene.id, layer);
      const selector = `.scene-${scene.id} [data-layer="${cssEscapeAttrValue(layer.id)}"]`;
      if (layer.legacyKey === "cta") {
        rules.push(`${selector} {\n  ${ctaClassCss(style, ctaBg, ctaText)}\n}`);
      } else if (layer.legacyKey === "headline" || layer.legacyKey === "subheadline") {
        rules.push(`${selector} {\n  ${headlineClassCss(style)}\n}`);
      } else {
        rules.push(`${selector} {\n  ${genericTextLayerCss(style, textColor)}\n}`);
      }
    }
  }

  return rules.join("\n");
}

function buildExportTextStyleRules(
  state: BannerEditorState,
  textColor: string,
  ctaBg: string,
  ctaText: string,
): string {
  const scenes = resolveExportScenes(state);
  const multiScene = scenes.length > 1 && !isLegacyFlatScene(scenes[0]!.id);
  if (multiScene) {
    return buildMultiSceneTextStyleRules(state, textColor, ctaBg, ctaText);
  }
  return buildGlobalLegacyTextClassRules(state, scenes[0]!.id, ctaBg, ctaText);
}

export function generateBannerCss(state: BannerEditorState): string {
  const bg = sanitizeCssColor(state.backgroundColor, "#0f172a");
  const text = sanitizeCssColor(state.textColor, "#f8fafc");
  const ctaBg = sanitizeCssColor(state.ctaBackgroundColor, "#7c3aed");
  const ctaText = sanitizeCssColor(state.ctaTextColor, "#ffffff");
  const accent = sanitizeCssColor(state.accentColor, "#a78bfa");

  const hasBgImage = projectHasBackgroundImage(state);
  const bannerBg = hasBgImage ? "transparent" : bg;
  const animationBlock = buildStoryboardRules(state);
  const textStyleBlock = buildExportTextStyleRules(state, text, ctaBg, ctaText);

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
${textStyleBlock}
.layer--underline {
  transform-origin: left center;
}
.scene-layer {
  position: absolute;
  inset: 0;
}
${animationBlock}`;
}
