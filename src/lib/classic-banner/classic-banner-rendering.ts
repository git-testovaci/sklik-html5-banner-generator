import type { ClassicBannerLayoutRect } from "@/lib/classic-banner/classic-banner-layout";
import {
  computeClassicImageRenderedRect,
  getClassicImageSlotFitOptions,
  resolveClassicBackgroundTransform,
  type ClassicImageDimensions,
} from "@/lib/classic-banner/classic-banner-image-fit";
import type { ClassicBannerImageSlot } from "@/lib/classic-banner/classic-banner-image-sources";
import { getClassicBannerSizeById } from "@/lib/classic-banner/classic-banner-sizes";
import type { ClassicBannerSizeVariant, ClassicEditableSlotId } from "@/types/classic-banner";

export interface ClassicBannerPixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Convert a percent-of-banner rect to pixel coordinates (top-left origin). */
export function classicBannerRectToPixels(
  rect: ClassicBannerLayoutRect,
  bannerWidth: number,
  bannerHeight: number,
): ClassicBannerPixelRect {
  return {
    x: (rect.left / 100) * bannerWidth,
    y: (rect.top / 100) * bannerHeight,
    width: (rect.width / 100) * bannerWidth,
    height: (rect.height / 100) * bannerHeight,
  };
}

export interface ResolveClassicBannerLayerDrawRectParams {
  slotId: ClassicEditableSlotId;
  layerRect: ClassicBannerLayoutRect;
  bannerWidth: number;
  bannerHeight: number;
  logoMaxHeight: number;
  hasBackgroundRectOverride?: boolean;
  imageDimensions?: ClassicImageDimensions | null;
}

/**
 * Canonical draw/display rect for a classic banner layer.
 * Preview positioning and canvas export must both use this helper.
 */
export function resolveClassicBannerLayerDrawRect(
  params: ResolveClassicBannerLayerDrawRectParams,
): ClassicBannerLayoutRect {
  const {
    slotId,
    layerRect,
    bannerWidth,
    bannerHeight,
    logoMaxHeight,
    hasBackgroundRectOverride = false,
    imageDimensions,
  } = params;

  if (slotId === "background") {
    return resolveClassicBackgroundTransform({
      baseRect: layerRect,
      hasManualRectOverride: hasBackgroundRectOverride,
      bannerWidth,
      bannerHeight,
      imageWidth: imageDimensions?.width,
      imageHeight: imageDimensions?.height,
    }).imageRect;
  }

  if (slotId === "logo" || slotId === "hero") {
    if (!imageDimensions) {
      return { ...layerRect };
    }
    const fitOpts = getClassicImageSlotFitOptions(slotId, logoMaxHeight);
    if (!fitOpts) {
      return { ...layerRect };
    }
    return computeClassicImageRenderedRect({
      layerRect,
      imageWidth: imageDimensions.width,
      imageHeight: imageDimensions.height,
      fit: fitOpts.fit,
      bannerWidth,
      bannerHeight,
      maxHeightPx: fitOpts.maxHeightPx,
      align: fitOpts.align,
      allowUpscale: fitOpts.allowUpscale,
    });
  }

  return { ...layerRect };
}

export function classicBannerImageSlotFromLayer(
  slotId: ClassicEditableSlotId,
): ClassicBannerImageSlot | null {
  if (slotId === "background" || slotId === "logo" || slotId === "hero") {
    return slotId;
  }
  return null;
}

/** Canonical pixel dimensions for a variant — prefer registry over stored variant fields. */
export function resolveClassicBannerVariantDimensions(variant: ClassicBannerSizeVariant): {
  width: number;
  height: number;
  family: ClassicBannerSizeVariant["family"];
} {
  const sizeDef = getClassicBannerSizeById(variant.sizeId);
  return {
    width: sizeDef?.width ?? variant.width,
    height: sizeDef?.height ?? variant.height,
    family: sizeDef?.family ?? variant.family,
  };
}

export function withCanonicalClassicBannerVariant(
  variant: ClassicBannerSizeVariant,
): ClassicBannerSizeVariant {
  const dims = resolveClassicBannerVariantDimensions(variant);
  return { ...variant, width: dims.width, height: dims.height, family: dims.family };
}
