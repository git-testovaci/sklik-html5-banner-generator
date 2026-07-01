import type { ClassicBannerLayoutRect } from "@/lib/classic-banner/classic-banner-layout";
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
