import type { ExportAssetFile } from "@/lib/assets/asset-export";
import { presetClassName } from "@/lib/animation/animation-presets";
import { clampParticleCount } from "@/lib/animation/keyframe-utils";
import { buildFlatSliceForScene, getLayersForScene, totalStoryboardDurationMs } from "@/lib/animation/storyboard-utils";
import { getLayerAnimation } from "@/lib/animation/timeline-utils";
import type { BannerLayer } from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import {
  escapeHtmlAttribute,
  escapeHtmlText,
  sanitizePlainText,
} from "./sanitize-export-content";

function assetPathMap(files: ExportAssetFile[]): Map<string, string> {
  return new Map(files.map((f) => [f.assetId, f.path]));
}

function layerStyle(
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex: number,
  opacity: number,
  rotation: number,
): string {
  return [
    `left:${x}px`,
    `top:${y}px`,
    `width:${width}px`,
    `height:${height}px`,
    `z-index:${zIndex}`,
    `opacity:${opacity}`,
    `transform:rotate(${rotation}deg)`,
  ].join(";");
}

function animClass(state: BannerEditorState, layerId: string): string {
  const anim = getLayerAnimation(state, layerId);
  if (!anim?.enabled || anim.preset === "none") return "";
  return ` ${presetClassName(layerId)}`;
}

function renderParticleLayer(layer: BannerLayer): string {
  const count = clampParticleCount(layer.particleCount ?? 16);
  const dots = Array.from({ length: count })
    .map(
      (_, i) =>
        `<span class="p-${layer.id}-${i}" style="left:${(i * 17 + 5) % 95}%;top:${(i * 23 + 10) % 90}%;"></span>`,
    )
    .join("");
  return `<div class="layer layer--particle" style="${layerStyle(layer.x, layer.y, layer.width, layer.height, layer.zIndex, layer.opacity, layer.rotation)}">${dots}</div>`;
}

function renderUnderlineLayer(layer: BannerLayer, state: BannerEditorState): string {
  const color = layer.underlineColor ?? state.accentColor;
  return `<div class="layer layer--underline ul-${layer.id}" style="${layerStyle(layer.x, layer.y, layer.width, layer.thickness ?? 3, layer.zIndex, layer.opacity, layer.rotation)};background:${color};"></div>`;
}

function renderSceneLayers(
  state: BannerEditorState,
  sceneId: string,
  paths: Map<string, string>,
): string {
  const slice = buildFlatSliceForScene(state, sceneId);
  const sceneState: BannerEditorState = { ...state, ...slice };

  const headline = escapeHtmlText(sanitizePlainText(sceneState.headline, "Headline", 120));
  const subheadline = escapeHtmlText(sanitizePlainText(sceneState.subheadline, "Subheadline", 160));
  const cta = escapeHtmlText(sanitizePlainText(sceneState.cta, "Learn more", 40));
  const logo = escapeHtmlText(sanitizePlainText(state.logoLabel, "Logo", 24));
  const product = escapeHtmlText(sanitizePlainText(state.productImageLabel, "Product", 24));

  const layers = getLayersForScene(state, sceneId);
  const parts: string[] = [];

  for (const layer of layers.sort((a, b) => a.zIndex - b.zIndex)) {
    if (!layer.visible) continue;

    if (layer.type === "particle") {
      parts.push(renderParticleLayer(layer));
      continue;
    }
    if (layer.type === "underline") {
      parts.push(renderUnderlineLayer(layer, state));
      continue;
    }

    if (layer.type === "text") {
      const content = layer.text
        ? escapeHtmlText(sanitizePlainText(layer.text, "Text", 160))
        : layer.legacyKey === "headline"
          ? headline
          : layer.legacyKey === "subheadline"
            ? subheadline
            : layer.legacyKey === "cta"
              ? cta
              : escapeHtmlText(sanitizePlainText(layer.name, "Text", 80));
      const cls =
        layer.legacyKey === "cta"
          ? "layer--cta"
          : layer.legacyKey === "headline"
            ? "layer--headline"
            : layer.legacyKey === "subheadline"
              ? "layer--subheadline"
              : "layer--text";
      const animKey = layer.legacyKey ?? layer.id;
      parts.push(
        `<div class="layer ${cls}${animClass(sceneState, animKey)}" data-layer="${animKey}" style="${layerStyle(layer.x, layer.y, layer.width, layer.height, layer.zIndex, layer.opacity, layer.rotation)}">${content}</div>`,
      );
      continue;
    }

    if ((layer.type === "badge" || layer.type === "shape") && !layer.assetId && !layer.isTemplateSlot) {
      const label = escapeHtmlText(sanitizePlainText(layer.text ?? layer.name, "Badge", 40));
      const fx = (state.layerEffects ?? []).find(
        (e) => e.layerId === layer.id && e.sceneId === sceneId,
      );
      const fxClass =
        fx?.preset === "flip-180" || fx?.preset === "zoom-rotate-badge"
          ? ` ${layer.id}-fx`
          : "";
      const fill = layer.fill ?? state.accentColor;
      parts.push(
        `<div class="layer layer--badge${fxClass}" style="${layerStyle(layer.x, layer.y, layer.width, layer.height, layer.zIndex, layer.opacity, layer.rotation)};background:${fill};border-radius:${layer.shapeType === "circle" ? "999px" : "8px"};display:flex;align-items:center;justify-content:center;font-size:${layer.fontSize ?? 11}px;font-weight:700;color:${layer.color ?? "#fff"};">${label}</div>`,
      );
      continue;
    }

    if (
      (layer.type === "badge" || layer.type === "image") &&
      !layer.assetId &&
      layer.isTemplateSlot
    ) {
      const accent = state.accentColor;
      const radius = layer.shapeType === "circle" ? "999px" : `${layer.borderRadius ?? 10}px`;
      const grad = `linear-gradient(135deg, ${accent}22 0%, ${accent}08 100%)`;
      parts.push(
        `<div class="layer layer--slot-placeholder" style="${layerStyle(layer.x, layer.y, layer.width, layer.height, layer.zIndex, layer.opacity, layer.rotation)};background:${grad};border:1px solid ${accent}44;border-radius:${radius};"></div>`,
      );
      continue;
    }

    if (layer.type === "image" && !layer.assetId) {
      const label = escapeHtmlText(sanitizePlainText(layer.name, "Frame", 24));
      parts.push(
        `<div class="layer layer--product layer--placeholder" style="${layerStyle(layer.x, layer.y, layer.width, layer.height, layer.zIndex, layer.opacity, layer.rotation)};border:1px dashed ${state.accentColor};display:flex;align-items:center;justify-content:center;">${label}</div>`,
      );
      continue;
    }

    if ((layer.type === "image" || layer.type === "badge") && layer.assetId) {
      const path = paths.get(layer.assetId);
      const kind = layer.legacyKey ?? "decoration";
      const layerId = kind === "decoration" ? `decoration-${layer.assetId}` : kind;
      const fx = (state.layerEffects ?? []).find(
        (e) => e.layerId === layer.id && e.sceneId === sceneId,
      );
      const fxClass =
        fx?.preset === "flip-180" || fx?.preset === "zoom-rotate-badge"
          ? ` ${layer.assetId}-fx`
          : "";
      if (path) {
        parts.push(
          `<div class="layer layer--${kind}${animClass(sceneState, layerId)}${fxClass}" data-layer="${kind}" style="${layerStyle(layer.x, layer.y, layer.width, layer.height, layer.zIndex, layer.opacity, layer.rotation)}"><img class="layer__img layer__img--${layer.fit ?? "contain"}" src="${escapeHtmlAttribute(path)}" alt=""></div>`,
        );
      } else {
        const placeholder = kind === "logo" ? logo : kind === "product" ? product : kind;
        parts.push(
          `<div class="layer layer--${kind} layer--placeholder${animClass(sceneState, layerId)}" style="${layerStyle(layer.x, layer.y, layer.width, layer.height, layer.zIndex, layer.opacity, layer.rotation)}"><span>${placeholder}</span></div>`,
        );
      }
    }
  }

  return parts.join("\n");
}

export function generateBannerHtml(
  state: BannerEditorState,
  assetFiles: ExportAssetFile[] = [],
): string {
  const paths = assetPathMap(assetFiles);
  const title = escapeHtmlText(sanitizePlainText(state.name, "Banner", 80));
  const scenes = state.scenes ?? [];

  let bodyLayers: string;

  if (scenes.length > 1) {
    bodyLayers = scenes
      .map(
        (scene) =>
          `    <div class="scene-layer scene-${scene.id}" data-scene="${escapeHtmlAttribute(scene.name)}">\n${renderSceneLayers(state, scene.id, paths)}\n    </div>`,
      )
      .join("\n");
  } else {
    const sceneId = scenes[0]?.id ?? "default";
    bodyLayers = renderSceneLayers(state, sceneId, paths);
  }

  const totalMs = scenes.length > 1 ? totalStoryboardDurationMs(state) : state.timeline?.durationMs ?? 3000;

  return `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="ad.size" content="width=${state.width},height=${state.height}">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="banner" class="banner" role="img" aria-label="${escapeHtmlAttribute(title)}" data-duration-ms="${totalMs}">
${bodyLayers}
  </div>
  <script src="script.js"></script>
</body>
</html>
`;
}
