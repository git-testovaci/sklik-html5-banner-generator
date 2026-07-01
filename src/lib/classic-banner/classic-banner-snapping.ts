import type { ClassicBannerLayoutRect } from "@/lib/classic-banner/classic-banner-layout";
import {
  clampClassicBannerLayerRect,
  resizeClassicBannerRectFromCorner,
  type ClassicBannerFinalLayout,
} from "@/lib/classic-banner/classic-banner-overrides";
import {
  CLASSIC_RESIZE_CORNER_OPPOSITE,
  type ClassicBannerResizeCorner,
} from "@/lib/classic-banner/classic-banner-selection";
import type { ClassicEditableSlotId } from "@/types/classic-banner";

export const CLASSIC_BANNER_SNAP_PX = 8;

export interface ClassicBannerSnapGuideLine {
  axis: "x" | "y";
  positionPercent: number;
}

export interface ClassicBannerSnapGuides {
  vertical: number[];
  horizontal: number[];
}

export interface ClassicBannerSnapContext {
  bannerWidth: number;
  bannerHeight: number;
  canvasScale: number;
  snapPx?: number;
  enabled: boolean;
}

export interface ClassicBannerSnapResult {
  rect: ClassicBannerLayoutRect;
  activeGuides: ClassicBannerSnapGuideLine[];
}

function snapThresholdPct(context: ClassicBannerSnapContext): { x: number; y: number } {
  const px = context.snapPx ?? CLASSIC_BANNER_SNAP_PX;
  const scale = context.canvasScale > 0 ? context.canvasScale : 1;
  return {
    x: (px / (context.bannerWidth * scale)) * 100,
    y: (px / (context.bannerHeight * scale)) * 100,
  };
}

function rectMetrics(rect: ClassicBannerLayoutRect) {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
    width: rect.width,
    height: rect.height,
  };
}

function rectCornerPoint(
  rect: ClassicBannerLayoutRect,
  corner: ClassicBannerResizeCorner,
): { x: number; y: number } {
  switch (corner) {
    case "tl":
      return { x: rect.left, y: rect.top };
    case "tr":
      return { x: rect.left + rect.width, y: rect.top };
    case "bl":
      return { x: rect.left, y: rect.top + rect.height };
    case "br":
      return { x: rect.left + rect.width, y: rect.top + rect.height };
  }
}

function rectFromAnchorAndSize(
  anchorCorner: ClassicBannerResizeCorner,
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
): ClassicBannerLayoutRect {
  switch (anchorCorner) {
    case "tl":
      return { left: anchorX, top: anchorY, width, height };
    case "br":
      return { left: anchorX - width, top: anchorY - height, width, height };
    case "tr":
      return { left: anchorX - width, top: anchorY, width, height };
    case "bl":
      return { left: anchorX, top: anchorY - height, width, height };
  }
}

function finalizeFromAnchor(
  anchorCorner: ClassicBannerResizeCorner,
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  slotId: ClassicEditableSlotId,
): ClassicBannerLayoutRect {
  const built = rectFromAnchorAndSize(anchorCorner, anchorX, anchorY, width, height);
  const clamped = clampClassicBannerLayerRect(slotId, built);
  return rectFromAnchorAndSize(anchorCorner, anchorX, anchorY, clamped.width, clamped.height);
}

/** Build snap guide positions for banner crop and optional other visible layers. */
export function buildClassicBannerSnapGuides(
  finalLayout: ClassicBannerFinalLayout,
  activeSlotId: ClassicEditableSlotId,
  options?: { includeOtherLayers?: boolean },
): ClassicBannerSnapGuides {
  const vertical = new Set<number>([0, 50, 100]);
  const horizontal = new Set<number>([0, 50, 100]);

  if (options?.includeOtherLayers !== false) {
    for (const layer of finalLayout.layers) {
      if (!layer.visible || layer.slotId === activeSlotId) continue;
      const m = rectMetrics(layer.rect);
      vertical.add(m.left);
      vertical.add(m.right);
      vertical.add(m.centerX);
      horizontal.add(m.top);
      horizontal.add(m.bottom);
      horizontal.add(m.centerY);
    }
  }

  return {
    vertical: [...vertical].sort((a, b) => a - b),
    horizontal: [...horizontal].sort((a, b) => a - b),
  };
}

export function snapClassicBannerMove(params: {
  rect: ClassicBannerLayoutRect;
  deltaXPercent: number;
  deltaYPercent: number;
  slotId: ClassicEditableSlotId;
  guides: ClassicBannerSnapGuides;
  context: ClassicBannerSnapContext;
}): ClassicBannerSnapResult {
  const { rect, deltaXPercent, deltaYPercent, slotId, guides, context } = params;

  const proposed: ClassicBannerLayoutRect = {
    ...rect,
    left: rect.left + deltaXPercent,
    top: rect.top + deltaYPercent,
  };

  if (!context.enabled) {
    return {
      rect: clampClassicBannerLayerRect(slotId, proposed),
      activeGuides: [],
    };
  }

  const threshold = snapThresholdPct(context);
  const m = rectMetrics(proposed);
  const activeGuides: ClassicBannerSnapGuideLine[] = [];

  let bestLeft = proposed.left;
  let bestTop = proposed.top;
  let bestXDist = threshold.x + 1;
  let bestYDist = threshold.y + 1;
  let snappedXGuide: number | null = null;
  let snappedYGuide: number | null = null;

  for (const guide of guides.vertical) {
    const leftDist = Math.abs(m.left - guide);
    if (leftDist <= threshold.x && leftDist < bestXDist) {
      bestXDist = leftDist;
      bestLeft = guide;
      snappedXGuide = guide;
    }
    const rightDist = Math.abs(m.right - guide);
    if (rightDist <= threshold.x && rightDist < bestXDist) {
      bestXDist = rightDist;
      bestLeft = guide - m.width;
      snappedXGuide = guide;
    }
    const centerDist = Math.abs(m.centerX - guide);
    if (centerDist <= threshold.x && centerDist < bestXDist) {
      bestXDist = centerDist;
      bestLeft = guide - m.width / 2;
      snappedXGuide = guide;
    }
  }

  for (const guide of guides.horizontal) {
    const topDist = Math.abs(m.top - guide);
    if (topDist <= threshold.y && topDist < bestYDist) {
      bestYDist = topDist;
      bestTop = guide;
      snappedYGuide = guide;
    }
    const bottomDist = Math.abs(m.bottom - guide);
    if (bottomDist <= threshold.y && bottomDist < bestYDist) {
      bestYDist = bottomDist;
      bestTop = guide - m.height;
      snappedYGuide = guide;
    }
    const centerDist = Math.abs(m.centerY - guide);
    if (centerDist <= threshold.y && centerDist < bestYDist) {
      bestYDist = centerDist;
      bestTop = guide - m.height / 2;
      snappedYGuide = guide;
    }
  }

  if (snappedXGuide !== null) {
    activeGuides.push({ axis: "x", positionPercent: snappedXGuide });
  }
  if (snappedYGuide !== null) {
    activeGuides.push({ axis: "y", positionPercent: snappedYGuide });
  }

  const snapped = clampClassicBannerLayerRect(slotId, {
    ...proposed,
    left: bestXDist <= threshold.x ? bestLeft : proposed.left,
    top: bestYDist <= threshold.y ? bestTop : proposed.top,
  });

  return { rect: snapped, activeGuides };
}

interface ResizeEdgeSnap {
  guide: number;
  distance: number;
  width: number;
  height: number;
  axis: "x" | "y";
}

function applyResizeEdgeSnaps(params: {
  anchorCorner: ClassicBannerResizeCorner;
  anchorX: number;
  anchorY: number;
  width: number;
  height: number;
  corner: ClassicBannerResizeCorner;
  guides: ClassicBannerSnapGuides;
  threshold: { x: number; y: number };
  preserveAspect: boolean;
  aspectRatio: number;
}): { width: number; height: number; activeGuides: ClassicBannerSnapGuideLine[] } {
  const {
    anchorCorner,
    anchorX,
    anchorY,
    width,
    height,
    corner,
    guides,
    threshold,
    preserveAspect,
    aspectRatio,
  } = params;

  const xSnaps: ResizeEdgeSnap[] = [];
  const ySnaps: ResizeEdgeSnap[] = [];

  const addX = (guide: number, distance: number, nextWidth: number, nextHeight: number) => {
    if (distance <= threshold.x) {
      xSnaps.push({ guide, distance, width: nextWidth, height: nextHeight, axis: "x" });
    }
  };

  const addY = (guide: number, distance: number, nextWidth: number, nextHeight: number) => {
    if (distance <= threshold.y) {
      ySnaps.push({ guide, distance, width: nextWidth, height: nextHeight, axis: "y" });
    }
  };

  const right = anchorCorner === "tl" || anchorCorner === "bl" ? anchorX + width : anchorX;
  const left = anchorCorner === "br" || anchorCorner === "tr" ? anchorX - width : anchorX;
  const bottom = anchorCorner === "tl" || anchorCorner === "tr" ? anchorY + height : anchorY;
  const top = anchorCorner === "br" || anchorCorner === "bl" ? anchorY - height : anchorY;

  const movesRight = corner === "br" || corner === "tr";
  const movesLeft = corner === "tl" || corner === "bl";
  const movesBottom = corner === "br" || corner === "bl";
  const movesTop = corner === "tl" || corner === "tr";

  if (movesRight) {
    for (const guide of guides.vertical) {
      const w = guide - anchorX;
      if (anchorCorner === "tl" || anchorCorner === "bl") {
        addX(guide, Math.abs(right - guide), w, height);
      }
    }
  }

  if (movesLeft) {
    for (const guide of guides.vertical) {
      const w = anchorX - guide;
      if (anchorCorner === "br" || anchorCorner === "tr") {
        addX(guide, Math.abs(left - guide), w, height);
      }
    }
  }

  if (movesBottom) {
    for (const guide of guides.horizontal) {
      const h = guide - anchorY;
      if (anchorCorner === "tl" || anchorCorner === "tr") {
        addY(guide, Math.abs(bottom - guide), width, h);
      }
    }
  }

  if (movesTop) {
    for (const guide of guides.horizontal) {
      const h = anchorY - guide;
      if (anchorCorner === "br" || anchorCorner === "bl") {
        addY(guide, Math.abs(top - guide), width, h);
      }
    }
  }

  const bestX = xSnaps.sort((a, b) => a.distance - b.distance)[0];
  const bestY = ySnaps.sort((a, b) => a.distance - b.distance)[0];

  let nextWidth = width;
  let nextHeight = height;
  const activeGuides: ClassicBannerSnapGuideLine[] = [];

  if (preserveAspect && aspectRatio > 0 && bestX && bestY) {
    if (bestX.distance <= bestY.distance) {
      nextWidth = bestX.width;
      nextHeight = nextWidth / aspectRatio;
      activeGuides.push({ axis: "x", positionPercent: bestX.guide });
    } else {
      nextHeight = bestY.height;
      nextWidth = nextHeight * aspectRatio;
      activeGuides.push({ axis: "y", positionPercent: bestY.guide });
    }
  } else {
    if (bestX) {
      nextWidth = bestX.width;
      activeGuides.push({ axis: "x", positionPercent: bestX.guide });
    }
    if (bestY) {
      nextHeight = bestY.height;
      activeGuides.push({ axis: "y", positionPercent: bestY.guide });
    }
    if (preserveAspect && aspectRatio > 0 && (bestX || bestY)) {
      if (bestX && !bestY) {
        nextHeight = nextWidth / aspectRatio;
      } else if (bestY && !bestX) {
        nextWidth = nextHeight * aspectRatio;
      }
    }
  }

  return { width: nextWidth, height: nextHeight, activeGuides };
}

export function snapClassicBannerResize(params: {
  rect: ClassicBannerLayoutRect;
  corner: ClassicBannerResizeCorner;
  deltaXPercent: number;
  deltaYPercent: number;
  preserveAspect: boolean;
  aspectRatio?: number;
  slotId: ClassicEditableSlotId;
  guides: ClassicBannerSnapGuides;
  context: ClassicBannerSnapContext;
}): ClassicBannerSnapResult {
  const {
    rect,
    corner,
    deltaXPercent,
    deltaYPercent,
    preserveAspect,
    aspectRatio,
    slotId,
    guides,
    context,
  } = params;

  const unsnapped = resizeClassicBannerRectFromCorner({
    rect,
    corner,
    deltaXPercent,
    deltaYPercent,
    preserveAspect,
    aspectRatio,
    slotId,
  });

  if (!context.enabled) {
    return { rect: unsnapped, activeGuides: [] };
  }

  const anchorCorner = CLASSIC_RESIZE_CORNER_OPPOSITE[corner];
  const anchor = rectCornerPoint(rect, anchorCorner);
  const threshold = snapThresholdPct(context);
  const aspect = aspectRatio ?? unsnapped.width / Math.max(unsnapped.height, 0.01);

  const { width, height, activeGuides } = applyResizeEdgeSnaps({
    anchorCorner,
    anchorX: anchor.x,
    anchorY: anchor.y,
    width: unsnapped.width,
    height: unsnapped.height,
    corner,
    guides,
    threshold,
    preserveAspect,
    aspectRatio: aspect,
  });

  const snapped = finalizeFromAnchor(
    anchorCorner,
    anchor.x,
    anchor.y,
    width,
    height,
    slotId,
  );

  return { rect: snapped, activeGuides };
}
