import JSZip from "jszip";
import {
  resolveClassicBannerFinalLayout,
  classicBannerSlotHasRectOverride,
  type ClassicBannerResolvedLayer,
} from "@/lib/classic-banner/classic-banner-overrides";
import type { ClassicBannerLayoutRect } from "@/lib/classic-banner/classic-banner-layout";
import {
  drawClassicBackgroundImageInBox,
  resolveClassicBackgroundTransform,
  type ClassicImageDimensions,
} from "@/lib/classic-banner/classic-banner-image-fit";
import {
  loadClassicBannerImageForCanvas,
  type ClassicBannerImageSlot,
} from "@/lib/classic-banner/classic-banner-image-sources";
import {
  classicBannerImageSlotFromLayer,
  classicBannerRectToPixels,
  resolveClassicBannerLayerDrawRect,
  resolveClassicBannerVariantDimensions,
  withCanonicalClassicBannerVariant,
  type ClassicBannerPixelRect,
} from "@/lib/classic-banner/classic-banner-rendering";
import {
  awaitClassicBannerCanvasFonts,
  measureClassicBadgePillRect,
  measureClassicCtaButtonRect,
  wrapClassicHeadlineLines,
} from "@/lib/classic-banner/classic-banner-text";
import { CLASSIC_BANNER_SIZES, getClassicBannerSizeById } from "@/lib/classic-banner/classic-banner-sizes";
import type {
  ClassicBannerDesignTokens,
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicEditableSlotId,
} from "@/types/classic-banner";

export const CLASSIC_BANNER_CORS_ERROR =
  "Obrázek z externí URL nejde exportovat kvůli CORS. Nahrajte obrázek lokálně nebo použijte jiný zdroj.";

export interface ClassicBannerPngExportResult {
  blob: Blob;
  warnings: string[];
}

export interface ClassicBannerZipExportResult {
  blob: Blob;
  warnings: string[];
  exportedCount: number;
}

export interface ClassicBannerZipManifest {
  generatedAt: string;
  projectType: "classic-banner";
  variantCount: number;
  variants: Array<{
    sizeId: string;
    width: number;
    height: number;
    family: ClassicBannerSizeVariant["family"];
    networks: { sklik: boolean; google: boolean; microsoft: boolean };
    filename: string;
  }>;
  warnings: string[];
}

function resolveClassicBannerExportDimensions(variant: ClassicBannerSizeVariant): {
  width: number;
  height: number;
} {
  const dims = resolveClassicBannerVariantDimensions(variant);
  return { width: dims.width, height: dims.height };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawInRotatedBox(
  ctx: CanvasRenderingContext2D,
  box: ClassicBannerPixelRect,
  rotationDeg: number,
  draw: (ctx: CanvasRenderingContext2D, box: ClassicBannerPixelRect) => void,
): void {
  if (Math.abs(rotationDeg) < 0.01) {
    draw(ctx, box);
    return;
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  draw(ctx, {
    x: -box.width / 2,
    y: -box.height / 2,
    width: box.width,
    height: box.height,
  });
  ctx.restore();
}

function drawHeadlineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: ClassicBannerPixelRect,
  tokens: ClassicBannerDesignTokens,
  fontSize: number,
  maxLines: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();

  ctx.fillStyle = tokens.textColor;
  ctx.font = `${tokens.headlineFontWeight} ${fontSize}px ${tokens.fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const lineHeight = fontSize * 1.15;
  const lines = wrapClassicHeadlineLines(ctx, text, box.width, maxLines);

  lines.forEach((line, index) => {
    ctx.fillText(line, box.x, box.y + index * lineHeight);
  });

  ctx.restore();
}

function drawSloganText(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: ClassicBannerPixelRect,
  tokens: ClassicBannerDesignTokens,
  fontSize: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();

  ctx.globalAlpha = 0.92;
  ctx.fillStyle = tokens.textColor;
  ctx.font = `${tokens.bodyFontWeight} ${fontSize}px ${tokens.fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, box.x, box.y, box.width);
  ctx.restore();
}

function drawCtaButton(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: ClassicBannerPixelRect,
  tokens: ClassicBannerDesignTokens,
  fontSize: number,
  paddingX: number,
  paddingY: number,
): void {
  const btn = measureClassicCtaButtonRect(ctx, text, box, tokens, fontSize, paddingX, paddingY);

  roundRectPath(ctx, btn.x, btn.y, btn.width, btn.height, tokens.borderRadius);
  ctx.fillStyle = tokens.ctaBackgroundColor;
  ctx.fill();

  ctx.fillStyle = tokens.ctaTextColor;
  ctx.font = `${tokens.headlineFontWeight} ${fontSize}px ${tokens.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, btn.x + btn.width / 2, btn.y + btn.height / 2);
}

function drawBadgePill(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: ClassicBannerPixelRect,
  tokens: ClassicBannerDesignTokens,
  fontSize: number,
): void {
  const pill = measureClassicBadgePillRect(ctx, text, box, tokens, fontSize);

  roundRectPath(ctx, pill.x, pill.y, pill.width, pill.height, pill.height / 2);
  ctx.fillStyle = tokens.badgeBackgroundColor;
  ctx.fill();

  ctx.fillStyle = tokens.badgeTextColor;
  ctx.font = `600 ${fontSize}px ${tokens.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, pill.x + pill.width / 2, pill.y + pill.height / 2);
}

function resolveLayerDrawRect(
  layer: ClassicBannerResolvedLayer,
  bannerWidth: number,
  bannerHeight: number,
  logoMaxHeight: number,
  backgroundHasRectOverride: boolean,
  imageDimensionsBySlot: Partial<Record<ClassicBannerImageSlot, ClassicImageDimensions | null>>,
): ClassicBannerLayoutRect {
  const imageSlot = classicBannerImageSlotFromLayer(layer.slotId);
  return resolveClassicBannerLayerDrawRect({
    slotId: layer.slotId,
    layerRect: layer.rect,
    bannerWidth,
    bannerHeight,
    logoMaxHeight,
    hasBackgroundRectOverride:
      layer.slotId === "background" ? backgroundHasRectOverride : false,
    imageDimensions: imageSlot ? (imageDimensionsBySlot[imageSlot] ?? null) : null,
  });
}

function drawClassicRasterImageLayer(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  layer: ClassicBannerResolvedLayer,
  drawRect: ClassicBannerLayoutRect,
  bannerWidth: number,
  bannerHeight: number,
  useIntrinsicCoverFit: boolean,
): void {
  const box = classicBannerRectToPixels(drawRect, bannerWidth, bannerHeight);
  drawInRotatedBox(ctx, box, layer.rotationDeg, (drawCtx, localBox) => {
    drawClassicBackgroundImageInBox(drawCtx, img, localBox, useIntrinsicCoverFit);
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error(CLASSIC_BANNER_CORS_ERROR));
      }, "image/png");
    } catch {
      reject(new Error(CLASSIC_BANNER_CORS_ERROR));
    }
  });
}

export function classicBannerPngFilename(sizeId: string): string {
  return `classic-banner-${sizeId}.png`;
}

function slugifyProjectName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40);
}

export function classicBannerZipFilename(projectName?: string): string {
  const slug = slugifyProjectName(projectName?.trim() ?? "");
  if (slug) {
    return `classic-banner-${slug}-all-sizes.zip`;
  }
  return "classic-banners-all-sizes.zip";
}

function isCorsExportError(error: unknown): boolean {
  return error instanceof Error && error.message === CLASSIC_BANNER_CORS_ERROR;
}

function orderedClassicVariants(data: ClassicBannerProjectData): ClassicBannerSizeVariant[] {
  return CLASSIC_BANNER_SIZES.map((size) => {
    const variant = data.variants.find((item) => item.sizeId === size.id);
    if (variant) return variant;
    return {
      sizeId: size.id,
      width: size.width,
      height: size.height,
      family: size.family,
      status: "placeholder",
      layout: { family: size.family, status: "pending" },
    };
  });
}

function pushImageWarning(
  warnings: string[],
  result: { image: HTMLImageElement | null; warning?: string },
  missingMessage: string,
): void {
  if (result.warning && !warnings.includes(result.warning)) {
    warnings.push(result.warning);
  }
  if (!result.image) {
    warnings.push(missingMessage);
  }
}

/** Export all classic banner variants as PNG files inside a ZIP archive. */
export async function exportClassicBannerAllVariantsToZip(
  data: ClassicBannerProjectData,
): Promise<ClassicBannerZipExportResult> {
  const zip = new JSZip();
  const allWarnings: string[] = [];
  const manifestVariants: ClassicBannerZipManifest["variants"] = [];
  let exportedCount = 0;

  for (const variant of orderedClassicVariants(data)) {
    try {
      const { blob, warnings } = await exportClassicBannerVariantToPng(data, variant);
      const filename = classicBannerPngFilename(variant.sizeId);
      zip.file(filename, blob);
      exportedCount += 1;

      for (const warning of warnings) {
        const tagged = `${variant.sizeId}: ${warning}`;
        if (!allWarnings.includes(tagged)) {
          allWarnings.push(tagged);
        }
      }

      const sizeDef = getClassicBannerSizeById(variant.sizeId);
      manifestVariants.push({
        sizeId: variant.sizeId,
        width: sizeDef?.width ?? variant.width,
        height: sizeDef?.height ?? variant.height,
        family: variant.family,
        networks: sizeDef?.networks ?? { sklik: false, google: false, microsoft: false },
        filename,
      });
    } catch (error) {
      if (isCorsExportError(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Export se nepovedl";
      allWarnings.push(`${variant.sizeId}: ${message}`);
    }
  }

  if (exportedCount === 0) {
    throw new Error("ZIP export se nepovedl — žádná varianta se nevyexportovala.");
  }

  const manifest: ClassicBannerZipManifest = {
    generatedAt: new Date().toISOString(),
    projectType: "classic-banner",
    variantCount: exportedCount,
    variants: manifestVariants,
    warnings: allWarnings,
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return { blob, warnings: allWarnings, exportedCount };
}

/** Render selected variant at exact pixel dimensions to PNG. */
export async function exportClassicBannerVariantToPng(
  data: ClassicBannerProjectData,
  variant: ClassicBannerSizeVariant,
): Promise<ClassicBannerPngExportResult> {
  const { width, height } = resolveClassicBannerExportDimensions(variant);
  const { content, designTokens } = data;
  const warnings: string[] = [];

  const canonicalVariant = withCanonicalClassicBannerVariant(variant);
  const layout = resolveClassicBannerFinalLayout(data, canonicalVariant);
  const { layerBySlot } = layout;

  const showBackground = layerBySlot.background.visible;
  const showLogo = layerBySlot.logo.visible;
  const showHeadline = layerBySlot.headline.visible;
  const showSlogan = layerBySlot.slogan.visible;
  const showHero = layerBySlot.hero.visible;
  const showCta = layerBySlot.cta.visible;
  const showBadge = layerBySlot.badge.visible;

  const [backgroundResult, logoResult, heroResult] = await Promise.all([
    showBackground
      ? loadClassicBannerImageForCanvas(content, "background")
      : Promise.resolve({ image: null, source: "none" as const }),
    showLogo
      ? loadClassicBannerImageForCanvas(content, "logo")
      : Promise.resolve({ image: null, source: "none" as const }),
    showHero
      ? loadClassicBannerImageForCanvas(content, "hero")
      : Promise.resolve({ image: null, source: "none" as const }),
  ]);

  const backgroundImg = backgroundResult.image;
  const logoImg = logoResult.image;
  const heroImg = heroResult.image;

  if (showBackground) {
    pushImageWarning(
      warnings,
      backgroundResult,
      "Pozadí se nepodařilo načíst — export pokračuje bez obrázku pozadí.",
    );
  }
  if (showLogo) {
    pushImageWarning(
      warnings,
      logoResult,
      "Logo se nepodařilo načíst — export pokračuje bez loga.",
    );
  }
  if (showHero) {
    pushImageWarning(
      warnings,
      heroResult,
      "Hero obrázek se nepodařilo načíst — export pokračuje bez hero obrázku.",
    );
  }

  const imageDimensionsBySlot: Partial<
    Record<ClassicBannerImageSlot, ClassicImageDimensions | null>
  > = {
    background: backgroundImg
      ? { width: backgroundImg.naturalWidth, height: backgroundImg.naturalHeight }
      : null,
    logo: logoImg ? { width: logoImg.naturalWidth, height: logoImg.naturalHeight } : null,
    hero: heroImg ? { width: heroImg.naturalWidth, height: heroImg.naturalHeight } : null,
  };

  const backgroundHasRectOverride = classicBannerSlotHasRectOverride(
    data,
    variant.sizeId,
    "background",
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Export se nepovedl — canvas není k dispozici.");
  }

  await awaitClassicBannerCanvasFonts(designTokens);

  ctx.fillStyle = designTokens.primaryColor;
  ctx.fillRect(0, 0, width, height);

  const drawBySlot: Record<
    ClassicEditableSlotId,
    (layer: ClassicBannerResolvedLayer, drawRect: ClassicBannerLayoutRect) => void
  > = {
    background: (layer, drawRect) => {
      if (!backgroundImg || !showBackground) return;
      const backgroundTransform = resolveClassicBackgroundTransform({
        baseRect: layer.rect,
        hasManualRectOverride: backgroundHasRectOverride,
        bannerWidth: width,
        bannerHeight: height,
        imageWidth: imageDimensionsBySlot.background?.width,
        imageHeight: imageDimensionsBySlot.background?.height,
      });
      drawClassicRasterImageLayer(
        ctx,
        backgroundImg,
        layer,
        drawRect,
        width,
        height,
        backgroundTransform.useIntrinsicCoverFit,
      );
    },
    hero: (layer, drawRect) => {
      if (!showHero || !heroImg || drawRect.width <= 0 || drawRect.height <= 0) return;
      drawClassicRasterImageLayer(ctx, heroImg, layer, drawRect, width, height, false);
    },
    headline: (layer, drawRect) => {
      if (!showHeadline || !content.headline.trim()) return;
      const box = classicBannerRectToPixels(drawRect, width, height);
      drawInRotatedBox(ctx, box, layer.rotationDeg, (drawCtx, localBox) => {
        drawHeadlineText(
          drawCtx,
          content.headline,
          localBox,
          designTokens,
          layout.headlineFontSize,
          layout.headlineMaxLines,
        );
      });
    },
    slogan: (layer, drawRect) => {
      if (!showSlogan) return;
      const box = classicBannerRectToPixels(drawRect, width, height);
      drawInRotatedBox(ctx, box, layer.rotationDeg, (drawCtx, localBox) => {
        drawSloganText(drawCtx, content.slogan, localBox, designTokens, layout.sloganFontSize);
      });
    },
    logo: (layer, drawRect) => {
      if (!showLogo || !logoImg || drawRect.width <= 0 || drawRect.height <= 0) return;
      drawClassicRasterImageLayer(ctx, logoImg, layer, drawRect, width, height, false);
    },
    cta: (layer, drawRect) => {
      if (!showCta) return;
      const box = classicBannerRectToPixels(drawRect, width, height);
      drawInRotatedBox(ctx, box, layer.rotationDeg, (drawCtx, localBox) => {
        drawCtaButton(
          drawCtx,
          content.ctaText,
          localBox,
          designTokens,
          layout.ctaFontSize,
          layout.ctaPaddingX,
          layout.ctaPaddingY,
        );
      });
    },
    badge: (layer, drawRect) => {
      if (!showBadge || drawRect.width <= 0 || drawRect.height <= 0) return;
      const box = classicBannerRectToPixels(drawRect, width, height);
      drawInRotatedBox(ctx, box, layer.rotationDeg, (drawCtx, localBox) => {
        drawBadgePill(drawCtx, content.badgeText, localBox, designTokens, layout.badgeFontSize);
      });
    },
  };

  for (const layer of [...layout.layers].sort((a, b) => a.zIndex - b.zIndex)) {
    if (!layer.visible) continue;
    const drawRect = resolveLayerDrawRect(
      layer,
      width,
      height,
      layout.logoMaxHeight,
      backgroundHasRectOverride,
      imageDimensionsBySlot,
    );
    drawBySlot[layer.slotId](layer, drawRect);
  }

  const blob = await canvasToPngBlob(canvas);
  return { blob, warnings };
}
