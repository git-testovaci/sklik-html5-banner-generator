import type { ClassicBannerLayoutRect } from "@/lib/classic-banner/classic-banner-layout";
import { clampClassicBannerBackgroundRect } from "@/lib/classic-banner/classic-banner-overrides";
import type { ClassicEditableSlotId } from "@/types/classic-banner";

export type ClassicImageFitMode = "contain" | "cover";
export type ClassicImageFitAlign = "center" | "top-left";

export interface ClassicImageDimensions {
  width: number;
  height: number;
}

export interface ComputeClassicImageRenderedRectParams {
  layerRect: ClassicBannerLayoutRect;
  imageWidth?: number;
  imageHeight?: number;
  fit: ClassicImageFitMode;
  bannerWidth: number;
  bannerHeight: number;
  /** Logo contain: cap box height used for fitting (pixels). */
  maxHeightPx?: number;
  align?: ClassicImageFitAlign;
  /** When false, contain never scales above 1 (classic logo/hero behavior). */
  allowUpscale?: boolean;
}

export interface ClassicImageSlotFitOptions {
  fit: ClassicImageFitMode;
  align: ClassicImageFitAlign;
  maxHeightPx?: number;
  allowUpscale: boolean;
}

export function getClassicImageSlotFitOptions(
  slotId: ClassicEditableSlotId,
  logoMaxHeight?: number,
): ClassicImageSlotFitOptions | null {
  switch (slotId) {
    case "logo":
      return {
        fit: "contain",
        align: "top-left",
        maxHeightPx: logoMaxHeight,
        allowUpscale: false,
      };
    case "hero":
      return {
        fit: "contain",
        align: "center",
        allowUpscale: false,
      };
    case "background":
      return {
        fit: "cover",
        align: "top-left",
        allowUpscale: true,
      };
    default:
      return null;
  }
}

function layerRectToPixels(
  rect: ClassicBannerLayoutRect,
  bannerWidth: number,
  bannerHeight: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: (rect.left / 100) * bannerWidth,
    y: (rect.top / 100) * bannerHeight,
    width: (rect.width / 100) * bannerWidth,
    height: (rect.height / 100) * bannerHeight,
  };
}

function pixelsToLayerRect(
  x: number,
  y: number,
  width: number,
  height: number,
  bannerWidth: number,
  bannerHeight: number,
): ClassicBannerLayoutRect {
  return {
    left: (x / bannerWidth) * 100,
    top: (y / bannerHeight) * 100,
    width: (width / bannerWidth) * 100,
    height: (height / bannerHeight) * 100,
  };
}

/** Actual rendered image rect inside a layer rect (percent of banner). */
export function computeClassicImageRenderedRect(
  params: ComputeClassicImageRenderedRectParams,
): ClassicBannerLayoutRect {
  const {
    layerRect,
    imageWidth,
    imageHeight,
    fit,
    bannerWidth,
    bannerHeight,
    maxHeightPx,
    align = "center",
    allowUpscale = true,
  } = params;

  if (
    !imageWidth ||
    !imageHeight ||
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    bannerWidth <= 0 ||
    bannerHeight <= 0
  ) {
    return { ...layerRect };
  }

  if (fit === "cover") {
    return { ...layerRect };
  }

  const box = layerRectToPixels(layerRect, bannerWidth, bannerHeight);
  let fitBoxH = box.height;
  if (maxHeightPx !== undefined) {
    fitBoxH = Math.min(fitBoxH, maxHeightPx);
  }

  let scale = Math.min(box.width / imageWidth, fitBoxH / imageHeight);
  if (!allowUpscale) {
    scale = Math.min(scale, 1);
  }

  const dw = imageWidth * scale;
  const dh = imageHeight * scale;

  let dx = 0;
  let dy = 0;
  if (align === "center") {
    dx = (box.width - dw) / 2;
    dy = (box.height - dh) / 2;
  }

  return pixelsToLayerRect(box.x + dx, box.y + dy, dw, dh, bannerWidth, bannerHeight);
}

export const CLASSIC_BANNER_CROP_RECT: ClassicBannerLayoutRect = {
  left: 0,
  top: 0,
  width: 100,
  height: 100,
};

export function isClassicBackgroundDefaultRect(rect: ClassicBannerLayoutRect): boolean {
  return (
    Math.abs(rect.left) < 0.05 &&
    Math.abs(rect.top) < 0.05 &&
    Math.abs(rect.width - 100) < 0.05 &&
    Math.abs(rect.height - 100) < 0.05
  );
}

export interface ResolveClassicBackgroundTransformParams {
  baseRect: ClassicBannerLayoutRect;
  hasManualRectOverride: boolean;
  imageWidth?: number;
  imageHeight?: number;
  bannerWidth: number;
  bannerHeight: number;
}

export interface ClassicBackgroundTransform {
  /** Effective background image layer rect (percent of banner). */
  imageRect: ClassicBannerLayoutRect;
  /** Fixed banner crop reference — normally 0/0/100/100. */
  cropRect: ClassicBannerLayoutRect;
  hasIntrinsicDimensions: boolean;
  /** True when imageRect was computed from automatic cover fit. */
  isAutomaticCover: boolean;
  /**
   * When true, the image must be fitted with object-cover / canvas cover inside imageRect
   * (fallback when intrinsic dimensions are unknown).
   */
  useIntrinsicCoverFit: boolean;
}

/**
 * Canonical background transform: one source of truth for preview, selection, inspector, export.
 */
export function resolveClassicBackgroundTransform(
  params: ResolveClassicBackgroundTransformParams,
): ClassicBackgroundTransform {
  const {
    baseRect,
    hasManualRectOverride,
    imageWidth,
    imageHeight,
    bannerWidth,
    bannerHeight,
  } = params;

  const cropRect = CLASSIC_BANNER_CROP_RECT;
  const hasIntrinsicDimensions =
    imageWidth !== undefined &&
    imageHeight !== undefined &&
    imageWidth > 0 &&
    imageHeight > 0;

  if (hasManualRectOverride) {
    return {
      imageRect: { ...baseRect },
      cropRect,
      hasIntrinsicDimensions,
      isAutomaticCover: false,
      useIntrinsicCoverFit: false,
    };
  }

  if (hasIntrinsicDimensions && isClassicBackgroundDefaultRect(baseRect)) {
    return {
      imageRect: computeClassicBackgroundCoverRect(
        bannerWidth,
        bannerHeight,
        imageWidth,
        imageHeight,
      ),
      cropRect,
      hasIntrinsicDimensions,
      isAutomaticCover: true,
      useIntrinsicCoverFit: false,
    };
  }

  return {
    imageRect: { ...baseRect },
    cropRect,
    hasIntrinsicDimensions,
    isAutomaticCover: false,
    useIntrinsicCoverFit: !hasIntrinsicDimensions,
  };
}

/**
 * Cover-style background image layer rect under a fixed banner crop.
 * May extend beyond 0–100% when image aspect differs from banner aspect.
 */
export function computeClassicBackgroundCoverRect(
  bannerWidth: number,
  bannerHeight: number,
  imageWidth: number,
  imageHeight: number,
): ClassicBannerLayoutRect {
  if (
    bannerWidth <= 0 ||
    bannerHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return { left: 0, top: 0, width: 100, height: 100 };
  }

  const bannerRatio = bannerWidth / bannerHeight;
  const imageRatio = imageWidth / imageHeight;

  let widthPct: number;
  let heightPct: number;

  if (imageRatio > bannerRatio) {
    heightPct = 100;
    widthPct = 100 * (imageRatio / bannerRatio);
  } else {
    widthPct = 100;
    heightPct = 100 * (bannerRatio / imageRatio);
  }

  return clampClassicBannerBackgroundRect({
    left: (100 - widthPct) / 2,
    top: (100 - heightPct) / 2,
    width: widthPct,
    height: heightPct,
  });
}

export function resolveClassicBackgroundImageRect(params: {
  layerRect: ClassicBannerLayoutRect;
  hasRectOverride: boolean;
  bannerWidth: number;
  bannerHeight: number;
  imageWidth?: number;
  imageHeight?: number;
}): ClassicBannerLayoutRect {
  return resolveClassicBackgroundTransform({
    baseRect: params.layerRect,
    hasManualRectOverride: params.hasRectOverride,
    bannerWidth: params.bannerWidth,
    bannerHeight: params.bannerHeight,
    imageWidth: params.imageWidth,
    imageHeight: params.imageHeight,
  }).imageRect;
}

interface ClassicBackgroundPixelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Draw background image into a pixel box without double-applying cover fit. */
export function drawClassicBackgroundImageInBox(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: ClassicBackgroundPixelBox,
  useIntrinsicCoverFit: boolean,
): void {
  if (useIntrinsicCoverFit) {
    drawImageCoverToBox(ctx, img, box.x, box.y, box.width, box.height);
    return;
  }

  ctx.drawImage(img, 0, 0, img.width, img.height, box.x, box.y, box.width, box.height);
}

export interface DrawClassicImageFitParams {
  layerRect: ClassicBannerLayoutRect;
  imageWidth: number;
  imageHeight: number;
  fit: ClassicImageFitMode;
  canvasWidth: number;
  canvasHeight: number;
  maxHeightPx?: number;
  align?: ClassicImageFitAlign;
  allowUpscale?: boolean;
}

function drawImageCoverToBox(
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

/** Draw image into canvas using the same fit math as preview selection boxes. */
export function drawClassicImageFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  params: DrawClassicImageFitParams,
): void {
  const {
    layerRect,
    imageWidth,
    imageHeight,
    fit,
    canvasWidth,
    canvasHeight,
    maxHeightPx,
    align,
    allowUpscale,
  } = params;

  const rendered = computeClassicImageRenderedRect({
    layerRect,
    imageWidth,
    imageHeight,
    fit,
    bannerWidth: canvasWidth,
    bannerHeight: canvasHeight,
    maxHeightPx,
    align,
    allowUpscale,
  });

  const box = layerRectToPixels(rendered, canvasWidth, canvasHeight);

  if (fit === "cover") {
    drawImageCoverToBox(ctx, img, box.x, box.y, box.width, box.height);
    return;
  }

  ctx.drawImage(img, 0, 0, img.width, img.height, box.x, box.y, box.width, box.height);
}
