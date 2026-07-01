import JSZip from "jszip";
import {
  computeClassicBannerLayout,
  type ClassicBannerLayoutRect,
} from "@/lib/classic-banner/classic-banner-layout";
import { isClassicBannerSlotVisible } from "@/lib/classic-banner/classic-banner-update";
import { CLASSIC_BANNER_SIZES, getClassicBannerSizeById } from "@/lib/classic-banner/classic-banner-sizes";
import type {
  ClassicBannerDesignTokens,
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
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

function loadImage(url: string): Promise<HTMLImageElement | null> {
  const trimmed = url.trim();
  if (!trimmed) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = trimmed;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const boxRatio = w / h;
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

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawImageContainTopLeft(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  maxHeight?: number,
): void {
  const boxH = maxHeight ? Math.min(h, maxHeight) : h;
  const scale = Math.min(w / img.width, boxH / img.height, 1);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x, y, dw, dh);
}

function drawImageContainCenter(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const scale = Math.min(w / img.width, h / img.height, 1);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
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
  const { width, height, family } = variant;
  const { content, designTokens, slots } = data;
  const warnings: string[] = [];

  const layout = computeClassicBannerLayout({
    width,
    height,
    family,
    content,
    designTokens,
    slots,
  });

  const showLogo = isClassicBannerSlotVisible(data, "logo") && Boolean(content.logoUrl.trim());
  const showHeadline = isClassicBannerSlotVisible(data, "headline");
  const showSlogan =
    isClassicBannerSlotVisible(data, "slogan") &&
    layout.showSlogan &&
    Boolean(content.slogan.trim());
  const showHero =
    isClassicBannerSlotVisible(data, "hero") && Boolean(content.heroImageUrl.trim());
  const showCta = isClassicBannerSlotVisible(data, "cta") && Boolean(content.ctaText.trim());
  const showBadge =
    isClassicBannerSlotVisible(data, "badge") && Boolean(content.badgeText.trim());

  const [backgroundImg, logoImg, heroImg] = await Promise.all([
    content.backgroundUrl.trim() ? loadImage(content.backgroundUrl) : Promise.resolve(null),
    showLogo ? loadImage(content.logoUrl) : Promise.resolve(null),
    showHero ? loadImage(content.heroImageUrl) : Promise.resolve(null),
  ]);

  if (content.backgroundUrl.trim() && !backgroundImg) {
    warnings.push("Pozadí se nepodařilo načíst — export pokračuje bez obrázku pozadí.");
  }
  if (showLogo && !logoImg) {
    warnings.push("Logo se nepodařilo načíst — export pokračuje bez loga.");
  }
  if (showHero && !heroImg) {
    warnings.push("Hero obrázek se nepodařilo načíst — export pokračuje bez hero obrázku.");
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

  if (backgroundImg) {
    drawImageCover(ctx, backgroundImg, 0, 0, width, height);
  }

  const heroBox = rectToPixels(layout.hero, width, height);
  const headlineBox = rectToPixels(layout.headline, width, height);
  const sloganBox = rectToPixels(layout.slogan, width, height);
  const logoBox = rectToPixels(layout.logo, width, height);
  const ctaBox = rectToPixels(layout.cta, width, height);
  const badgeBox = rectToPixels(layout.badge, width, height);

  if (showHero && heroImg && heroBox.width > 0 && heroBox.height > 0) {
    drawImageContainCenter(ctx, heroImg, heroBox.x, heroBox.y, heroBox.width, heroBox.height);
  }

  if (showHeadline && content.headline.trim()) {
    drawHeadlineText(
      ctx,
      content.headline,
      headlineBox,
      designTokens,
      layout.headlineFontSize,
      layout.headlineMaxLines,
    );
  }

  if (showSlogan) {
    drawSloganText(ctx, content.slogan, sloganBox, designTokens, layout.sloganFontSize);
  }

  if (showLogo && logoImg && logoBox.width > 0 && logoBox.height > 0) {
    drawImageContainTopLeft(
      ctx,
      logoImg,
      logoBox.x,
      logoBox.y,
      logoBox.width,
      logoBox.height,
      layout.logoMaxHeight,
    );
  }

  if (showCta) {
    drawCtaButton(
      ctx,
      content.ctaText,
      ctaBox,
      designTokens,
      layout.ctaFontSize,
      layout.ctaPaddingX,
      layout.ctaPaddingY,
    );
  }

  if (showBadge && badgeBox.width > 0 && badgeBox.height > 0) {
    drawBadgePill(ctx, content.badgeText, badgeBox, designTokens, layout.badgeFontSize);
  }

  const blob = await canvasToPngBlob(canvas);
  return { blob, warnings };
}
