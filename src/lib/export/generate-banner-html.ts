import type { ExportAssetFile } from "@/lib/assets/asset-export";
import {
  presetClassName,
} from "@/lib/animation/animation-presets";
import { getLayerAnimation, getTextPlacement } from "@/lib/animation/timeline-utils";
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

export function generateBannerHtml(
  state: BannerEditorState,
  assetFiles: ExportAssetFile[] = [],
): string {
  const paths = assetPathMap(assetFiles);
  const title = escapeHtmlText(sanitizePlainText(state.name, "Banner", 80));
  const headline = escapeHtmlText(
    sanitizePlainText(state.headline, "Headline", 120),
  );
  const subheadline = escapeHtmlText(
    sanitizePlainText(state.subheadline, "Subheadline", 160),
  );
  const cta = escapeHtmlText(sanitizePlainText(state.cta, "Learn more", 40));
  const logo = escapeHtmlText(
    sanitizePlainText(state.logoLabel, "Logo", 24),
  );
  const product = escapeHtmlText(
    sanitizePlainText(state.productImageLabel, "Product", 24),
  );

  const headlinePl = getTextPlacement(state, "headline");
  const subPl = getTextPlacement(state, "subheadline");
  const ctaPl = getTextPlacement(state, "cta");

  const imageLayers = (state.assetPlacements ?? [])
    .filter((p) => p.visible)
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((placement) => {
      const path = paths.get(placement.assetId);
      const kind = placement.kind;
      const layerId = kind === "decoration" ? `decoration-${placement.assetId}` : kind;
      const cls = `layer layer--${kind}${animClass(state, layerId)}`;
      const style = layerStyle(
        placement.x,
        placement.y,
        placement.width,
        placement.height,
        placement.zIndex,
        placement.opacity,
        placement.rotation,
      );
      const radius = placement.borderRadius ? ` border-radius:${placement.borderRadius}px;` : "";
      const shadow = placement.shadow ? " box-shadow:0 4px 12px rgba(0,0,0,0.25);" : "";

      if (path) {
        return `    <div class="${cls}" style="${style}${radius}${shadow}"><img class="layer__img layer__img--${placement.fit}" src="${escapeHtmlAttribute(path)}" alt=""></div>`;
      }

      const placeholder =
        kind === "logo" ? logo : kind === "product" ? product : kind;
      return `    <div class="${cls} layer--placeholder" style="${style}${radius}${shadow}"><span>${escapeHtmlText(placeholder)}</span></div>`;
    })
    .join("\n");

  const headlineHtml = headlinePl?.visible !== false
    ? `    <h1 class="layer layer--headline${animClass(state, "headline")}" style="${layerStyle(headlinePl?.x ?? 8, headlinePl?.y ?? 28, headlinePl?.width ?? state.width * 0.5, headlinePl?.height ?? 40, headlinePl?.zIndex ?? 30, headlinePl?.opacity ?? 1, headlinePl?.rotation ?? 0)}">${headline}</h1>`
    : "";

  const subHtml = subPl?.visible !== false
    ? `    <p class="layer layer--subheadline${animClass(state, "subheadline")}" style="${layerStyle(subPl?.x ?? 8, subPl?.y ?? 50, subPl?.width ?? state.width * 0.5, subPl?.height ?? 30, subPl?.zIndex ?? 31, subPl?.opacity ?? 1, subPl?.rotation ?? 0)}">${subheadline}</p>`
    : "";

  const ctaHtml = ctaPl?.visible !== false
    ? `    <span class="layer layer--cta${animClass(state, "cta")}" style="${layerStyle(ctaPl?.x ?? 8, ctaPl?.y ?? 72, ctaPl?.width ?? state.width * 0.35, ctaPl?.height ?? 28, ctaPl?.zIndex ?? 32, ctaPl?.opacity ?? 1, ctaPl?.rotation ?? 0)}">${cta}</span>`
    : "";

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
  <div id="banner" class="banner" role="img" aria-label="${escapeHtmlAttribute(title)}">
${imageLayers}
${headlineHtml}
${subHtml}
${ctaHtml}
  </div>
  <script src="script.js"></script>
</body>
</html>
`;
}
