import JSZip from "jszip";
import {
  resolveClassicBannerFinalLayout,
  classicBannerSlotHasRectOverride,
  type ClassicBannerResolvedLayer,
} from "@/lib/classic-banner/classic-banner-overrides";
import type { ClassicBannerLayoutRect } from "@/lib/classic-banner/classic-banner-layout";
import {
  computeClassicImageRenderedRect,
  getClassicImageSlotFitOptions,
  resolveClassicBackgroundImageRect,
} from "@/lib/classic-banner/classic-banner-image-fit";
import {
  loadClassicBannerImageForCanvas,
} from "@/lib/classic-banner/classic-banner-image-sources";
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

interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectToPixels(
  rect: ClassicBannerLayoutRect,
  canvasWidth: number,
  canvasHeight: number,
): PixelRect {
  return {
    x: (rect.left / 100) * canvasWidth,
    y: (rect.top / 100) * canvasHeight,
    width: (rect.width / 100) * canvasWidth,
    height: (rect.height / 100) * canvasHeight,
  };
}

function drawImageInLocalBox(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: PixelRect,
  fit: "contain" | "cover",
): void {
  if (fit === "cover") {
    const boxRatio = box.width / box.height;
    const imgRatio = img.width / img.height;
    let sx = 0;
    let sy = 0;
    let sw = img.width;
    let sh = img.height;

    if (imgRatio > boxRatio) {
      sw = img.height * boxRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / boxRatio;
      sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, box.x, box.y, box.width, box.height);
    return;
  }

  ctx.drawImage(img, 0, 0, img.width, img.height, box.x, box.y, box.width, box.height);
}

function drawClassicImageLayer(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  layer: ClassicBannerResolvedLayer,
  slotId: ClassicEditableSlotId,
  canvasWidth: number,
  canvasHeight: number,
  logoMaxHeight: number,
  hasRectOverride: boolean,
): void {
  const fitOpts = getClassicImageSlotFitOptions(slotId, logoMaxHeight);
  if (!fitOpts) return;

  let drawRect = layer.rect;

  if (slotId === "background") {
    drawRect = resolveClassicBackgroundImageRect({
      layerRect: layer.rect,
      hasRectOverride,
      bannerWidth: canvasWidth,
      bannerHeight: canvasHeight,
      imageWidth: img.naturalWidth,
      imageHeight: img.naturalHeight,
    });
  } else if (fitOpts.fit === "contain") {
    drawRect = computeClassicImageRenderedRect({
      layerRect: layer.rect,
      imageWidth: img.naturalWidth,
      imageHeight: img.naturalHeight,
      fit: fitOpts.fit,
      bannerWidth: canvasWidth,
      bannerHeight: canvasHeight,
      maxHeightPx: fitOpts.maxHeightPx,
      align: fitOpts.align,
      allowUpscale: fitOpts.allowUpscale,
    });
  }

  const pixelBox = rectToPixels(drawRect, canvasWidth, canvasHeight);
  drawInRotatedBox(ctx, pixelBox, layer.rotationDeg, (drawCtx, box) => {
    drawImageInLocalBox(drawCtx, img, box, fitOpts.fit);
  });
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

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      if (lines.length < maxLines) lines.push("");
      continue;
    }

    let current = words[0] ?? "";
    for (let i = 1; i < words.length; i++) {
      const word = words[i]!;
      const candidate = `${current} ${word}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
        if (lines.length >= maxLines) return lines.slice(0, maxLines);
      }
    }
    lines.push(current);
    if (lines.length >= maxLines) return lines.slice(0, maxLines);
  }

  return lines.slice(0, maxLines);
}

function drawInRotatedBox(
  ctx: CanvasRenderingContext2D,
  box: PixelRect,
  rotationDeg: number,
  draw: (ctx: CanvasRenderingContext2D, box: PixelRect) => void,
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
  box: PixelRect,
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
  const lines = wrapTextLines(ctx, text, box.width, maxLines);

  lines.forEach((line, index) => {
    ctx.fillText(line, box.x, box.y + index * lineHeight);
  });

  ctx.restore();
}

function drawSloganText(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: PixelRect,
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
  box: PixelRect,
  tokens: ClassicBannerDesignTokens,
  fontSize: number,
  paddingX: number,
  paddingY: number,
): void {
  ctx.font = `${tokens.headlineFontWeight} ${fontSize}px ${tokens.fontFamily}`;
  const textWidth = ctx.measureText(text).width;
  const btnWidth = Math.min(box.width, textWidth + paddingX * 2);
  const btnHeight = Math.min(box.height, fontSize + paddingY * 2);
  const btnX = box.x;
  const btnY = box.y + box.height - btnHeight;

  roundRectPath(ctx, btnX, btnY, btnWidth, btnHeight, tokens.borderRadius);
  ctx.fillStyle = tokens.ctaBackgroundColor;
  ctx.fill();

  ctx.fillStyle = tokens.ctaTextColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, btnX + btnWidth / 2, btnY + btnHeight / 2);
}

function drawBadgePill(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: PixelRect,
  tokens: ClassicBannerDesignTokens,
  fontSize: number,
): void {
  ctx.font = `600 ${fontSize}px ${tokens.fontFamily}`;
  const textWidth = ctx.measureText(text).width;
  const pillW = Math.min(box.width, textWidth + 16);
  const pillH = Math.min(box.height, fontSize + 6);
  const pillX = box.x + box.width - pillW;
  const pillY = box.y;

  roundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = tokens.badgeBackgroundColor;
  ctx.fill();

  ctx.fillStyle = tokens.badgeTextColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, pillX + pillW / 2, pillY + pillH / 2);
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
        width: variant.width,
        height: variant.height,
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
  const { width, height } = variant;
  const { content, designTokens } = data;
  const warnings: string[] = [];

  const layout = resolveClassicBannerFinalLayout(data, variant);
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

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Export se nepovedl — canvas není k dispozici.");
  }

  ctx.fillStyle = designTokens.primaryColor;
  ctx.fillRect(0, 0, width, height);

  const backgroundHasRectOverride = classicBannerSlotHasRectOverride(
    data,
    variant.sizeId,
    "background",
  );

  const drawBySlot: Record<
    ClassicEditableSlotId,
    (layer: ClassicBannerResolvedLayer, box: PixelRect) => void
  > = {
    background: (layer) => {
      if (backgroundImg && showBackground) {
        drawClassicImageLayer(
          ctx,
          backgroundImg,
          layer,
          "background",
          width,
          height,
          layout.logoMaxHeight,
          backgroundHasRectOverride,
        );
      }
    },
    hero: (layer) => {
      if (showHero && heroImg && layer.rect.width > 0 && layer.rect.height > 0) {
        drawClassicImageLayer(
          ctx,
          heroImg,
          layer,
          "hero",
          width,
          height,
          layout.logoMaxHeight,
          false,
        );
      }
    },
    headline: (layer, headlineBox) => {
      if (showHeadline && content.headline.trim()) {
        drawInRotatedBox(ctx, headlineBox, layer.rotationDeg, (drawCtx, box) => {
          drawHeadlineText(
            drawCtx,
            content.headline,
            box,
            designTokens,
            layout.headlineFontSize,
            layout.headlineMaxLines,
          );
        });
      }
    },
    slogan: (layer, sloganBox) => {
      if (showSlogan) {
        drawInRotatedBox(ctx, sloganBox, layer.rotationDeg, (drawCtx, box) => {
          drawSloganText(drawCtx, content.slogan, box, designTokens, layout.sloganFontSize);
        });
      }
    },
    logo: (layer) => {
      if (showLogo && logoImg && layer.rect.width > 0 && layer.rect.height > 0) {
        drawClassicImageLayer(
          ctx,
          logoImg,
          layer,
          "logo",
          width,
          height,
          layout.logoMaxHeight,
          false,
        );
      }
    },
    cta: (layer, ctaBox) => {
      if (showCta) {
        drawInRotatedBox(ctx, ctaBox, layer.rotationDeg, (drawCtx, box) => {
          drawCtaButton(
            drawCtx,
            content.ctaText,
            box,
            designTokens,
            layout.ctaFontSize,
            layout.ctaPaddingX,
            layout.ctaPaddingY,
          );
        });
      }
    },
    badge: (layer, badgeBox) => {
      if (showBadge && badgeBox.width > 0 && badgeBox.height > 0) {
        drawInRotatedBox(ctx, badgeBox, layer.rotationDeg, (drawCtx, box) => {
          drawBadgePill(drawCtx, content.badgeText, box, designTokens, layout.badgeFontSize);
        });
      }
    },
  };

  for (const layer of [...layout.layers].sort((a, b) => a.zIndex - b.zIndex)) {
    if (!layer.visible) continue;
    const box = rectToPixels(layer.rect, width, height);
    drawBySlot[layer.slotId](layer, box);
  }

  const blob = await canvasToPngBlob(canvas);
  return { blob, warnings };
}
