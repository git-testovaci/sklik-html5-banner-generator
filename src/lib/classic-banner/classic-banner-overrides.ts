import {
  computeClassicBannerLayout,
  type ClassicBannerComputedLayout,
  type ClassicBannerLayoutRect,
} from "@/lib/classic-banner/classic-banner-layout";
import { hasClassicBannerImageSource } from "@/lib/classic-banner/classic-banner-image-sources";
import { isClassicBannerSlotVisible } from "@/lib/classic-banner/classic-banner-update";
import {
  CLASSIC_EDITABLE_SLOTS,
  CLASSIC_RESIZE_CORNER_OPPOSITE,
  type ClassicBannerResizeCorner,
} from "@/lib/classic-banner/classic-banner-selection";
import type {
  ClassicBannerLayerOverride,
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicBannerVariantOverrides,
  ClassicEditableSlotId,
} from "@/types/classic-banner";

export interface ClassicBannerResolvedLayer {
  slotId: ClassicEditableSlotId;
  rect: ClassicBannerLayoutRect;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  rotationDeg: number;
  hasOverride: boolean;
}

/** Final layout = computed base + per-variant overrides (preview & export SoT). */
export interface ClassicBannerFinalLayout extends ClassicBannerComputedLayout {
  layers: ClassicBannerResolvedLayer[];
  layerBySlot: Record<ClassicEditableSlotId, ClassicBannerResolvedLayer>;
}

const MIN_RECT_PERCENT = 2;
const ROTATION_MIN = -180;
const ROTATION_MAX = 180;

/** Background layer may extend beyond the banner crop window (Photopea-style). */
export const CLASSIC_BACKGROUND_RECT_MIN_LEFT = -200;
export const CLASSIC_BACKGROUND_RECT_MIN_TOP = -200;
export const CLASSIC_BACKGROUND_RECT_MAX_WIDTH = 400;
export const CLASSIC_BACKGROUND_RECT_MAX_HEIGHT = 400;
export const CLASSIC_BACKGROUND_MIN_SIZE = 20;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rectExceedsForegroundBounds(rect: ClassicBannerLayoutRect): boolean {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  return (
    rect.left < -0.001 ||
    rect.top < -0.001 ||
    rect.width > 100.001 ||
    rect.height > 100.001 ||
    right > 100.001 ||
    bottom > 100.001
  );
}

function clampClassicBannerForegroundRect(rect: ClassicBannerLayoutRect): ClassicBannerLayoutRect {
  const width = clamp(rect.width, MIN_RECT_PERCENT, 100);
  const height = clamp(rect.height, MIN_RECT_PERCENT, 100);
  const left = clamp(rect.left, 0, 100 - width);
  const top = clamp(rect.top, 0, 100 - height);
  return { left, top, width, height };
}

export function clampClassicBannerBackgroundRect(
  rect: ClassicBannerLayoutRect,
): ClassicBannerLayoutRect {
  const width = clamp(
    rect.width,
    CLASSIC_BACKGROUND_MIN_SIZE,
    CLASSIC_BACKGROUND_RECT_MAX_WIDTH,
  );
  const height = clamp(
    rect.height,
    CLASSIC_BACKGROUND_MIN_SIZE,
    CLASSIC_BACKGROUND_RECT_MAX_HEIGHT,
  );
  const left = clamp(rect.left, CLASSIC_BACKGROUND_RECT_MIN_LEFT, 100);
  const top = clamp(rect.top, CLASSIC_BACKGROUND_RECT_MIN_TOP, 100);
  return { left, top, width, height };
}

export function clampClassicBannerLayerRect(
  slotId: ClassicEditableSlotId,
  rect: ClassicBannerLayoutRect,
): ClassicBannerLayoutRect {
  if (slotId === "background") {
    return clampClassicBannerBackgroundRect(rect);
  }
  return clampClassicBannerForegroundRect(rect);
}

/** Foreground clamp; infers background bounds when rect exceeds the banner. */
export function clampClassicBannerRect(rect: ClassicBannerLayoutRect): ClassicBannerLayoutRect {
  if (rectExceedsForegroundBounds(rect)) {
    return clampClassicBannerBackgroundRect(rect);
  }
  return clampClassicBannerForegroundRect(rect);
}

export function clampClassicBannerRotation(rotationDeg: number): number {
  if (!Number.isFinite(rotationDeg)) return 0;
  return clamp(Math.round(rotationDeg * 10) / 10, ROTATION_MIN, ROTATION_MAX);
}

export function layerRectCenter(rect: ClassicBannerLayoutRect): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
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

function minRectSizeForSlot(slotId: ClassicEditableSlotId): { minWidth: number; minHeight: number } {
  if (slotId === "background") {
    return {
      minWidth: CLASSIC_BACKGROUND_MIN_SIZE,
      minHeight: CLASSIC_BACKGROUND_MIN_SIZE,
    };
  }
  return { minWidth: MIN_RECT_PERCENT, minHeight: MIN_RECT_PERCENT };
}

function maxRectSizeForAnchor(
  slotId: ClassicEditableSlotId,
  anchorCorner: ClassicBannerResizeCorner,
  anchorX: number,
  anchorY: number,
): { maxWidth: number; maxHeight: number } {
  if (slotId === "background") {
    const maxW = CLASSIC_BACKGROUND_RECT_MAX_WIDTH;
    const maxH = CLASSIC_BACKGROUND_RECT_MAX_HEIGHT;
    switch (anchorCorner) {
      case "tl":
        return { maxWidth: maxW, maxHeight: maxH };
      case "br":
        return {
          maxWidth: Math.min(maxW, anchorX - CLASSIC_BACKGROUND_RECT_MIN_LEFT),
          maxHeight: Math.min(maxH, anchorY - CLASSIC_BACKGROUND_RECT_MIN_TOP),
        };
      case "tr":
        return {
          maxWidth: Math.min(maxW, anchorX - CLASSIC_BACKGROUND_RECT_MIN_LEFT),
          maxHeight: maxH,
        };
      case "bl":
        return {
          maxWidth: maxW,
          maxHeight: Math.min(maxH, anchorY - CLASSIC_BACKGROUND_RECT_MIN_TOP),
        };
    }
  }

  switch (anchorCorner) {
    case "tl":
      return { maxWidth: 100 - anchorX, maxHeight: 100 - anchorY };
    case "br":
      return { maxWidth: anchorX, maxHeight: anchorY };
    case "tr":
      return { maxWidth: anchorX, maxHeight: 100 - anchorY };
    case "bl":
      return { maxWidth: 100 - anchorX, maxHeight: anchorY };
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

/** Resize a layer rect by dragging one corner while keeping the opposite corner fixed. */
export function resizeClassicBannerRectFromCorner(params: {
  rect: ClassicBannerLayoutRect;
  corner: ClassicBannerResizeCorner;
  deltaXPercent: number;
  deltaYPercent: number;
  preserveAspect: boolean;
  aspectRatio?: number;
  slotId: ClassicEditableSlotId;
}): ClassicBannerLayoutRect {
  const {
    rect,
    corner,
    deltaXPercent,
    deltaYPercent,
    preserveAspect,
    aspectRatio,
    slotId,
  } = params;

  const anchorCorner = CLASSIC_RESIZE_CORNER_OPPOSITE[corner];
  const anchor = rectCornerPoint(rect, anchorCorner);
  const draggedStart = rectCornerPoint(rect, corner);

  const dragX = draggedStart.x + deltaXPercent;
  const dragY = draggedStart.y + deltaYPercent;

  let width = Math.abs(dragX - anchor.x);
  let height = Math.abs(dragY - anchor.y);

  if (preserveAspect && aspectRatio !== undefined && aspectRatio > 0) {
    const pointerRatio = width / Math.max(height, 0.001);
    if (pointerRatio > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }
  }

  const { minWidth, minHeight } = minRectSizeForSlot(slotId);
  width = Math.max(width, minWidth);
  height = Math.max(height, minHeight);

  const { maxWidth, maxHeight } = maxRectSizeForAnchor(slotId, anchorCorner, anchor.x, anchor.y);
  width = Math.min(width, maxWidth);
  height = Math.min(height, maxHeight);

  let next = rectFromAnchorAndSize(anchorCorner, anchor.x, anchor.y, width, height);
  next = clampClassicBannerLayerRect(slotId, next);

  const reanchored = rectFromAnchorAndSize(anchorCorner, anchor.x, anchor.y, next.width, next.height);
  return clampClassicBannerLayerRect(slotId, reanchored);
}

function rectFromComputed(
  computed: ClassicBannerComputedLayout,
  slotId: ClassicEditableSlotId,
): ClassicBannerLayoutRect {
  if (slotId === "background") {
    return { left: 0, top: 0, width: 100, height: 100 };
  }
  return { ...computed[slotId] };
}

function mergeRect(
  slotId: ClassicEditableSlotId,
  base: ClassicBannerLayoutRect,
  override?: ClassicBannerLayerOverride,
): ClassicBannerLayoutRect {
  if (!override?.rect) return base;
  return clampClassicBannerLayerRect(slotId, {
    left: override.rect.left ?? base.left,
    top: override.rect.top ?? base.top,
    width: override.rect.width ?? base.width,
    height: override.rect.height ?? base.height,
  });
}

function mergeRotation(override?: ClassicBannerLayerOverride): number {
  if (override?.rotationDeg === undefined) return 0;
  return clampClassicBannerRotation(override.rotationDeg);
}

function defaultLayerVisible(
  data: ClassicBannerProjectData,
  computed: ClassicBannerComputedLayout,
  slotId: ClassicEditableSlotId,
): boolean {
  const { content } = data;
  switch (slotId) {
    case "background":
      return hasClassicBannerImageSource(content, "background");
    case "logo":
      return (
        isClassicBannerSlotVisible(data, "logo") && hasClassicBannerImageSource(content, "logo")
      );
    case "headline":
      return isClassicBannerSlotVisible(data, "headline") && Boolean(content.headline.trim());
    case "slogan":
      return (
        isClassicBannerSlotVisible(data, "slogan") &&
        computed.showSlogan &&
        Boolean(content.slogan.trim())
      );
    case "hero":
      return (
        isClassicBannerSlotVisible(data, "hero") &&
        computed.showHero &&
        hasClassicBannerImageSource(content, "hero")
      );
    case "cta":
      return isClassicBannerSlotVisible(data, "cta") && Boolean(content.ctaText.trim());
    case "badge":
      return (
        isClassicBannerSlotVisible(data, "badge") &&
        computed.showBadge &&
        Boolean(content.badgeText.trim())
      );
    default:
      return false;
  }
}

function getVariantOverrides(
  data: ClassicBannerProjectData,
  sizeId: string,
): ClassicBannerVariantOverrides {
  return data.variantOverrides?.[sizeId] ?? {};
}

function hasAnyOverride(override?: ClassicBannerLayerOverride): boolean {
  if (!override) return false;
  return (
    override.rect !== undefined ||
    override.zIndex !== undefined ||
    override.visible !== undefined ||
    override.locked === true ||
    override.rotationDeg !== undefined
  );
}

export function resolveClassicBannerFinalLayout(
  data: ClassicBannerProjectData,
  variant: ClassicBannerSizeVariant,
): ClassicBannerFinalLayout {
  const { width, height, family } = variant;
  const computed = computeClassicBannerLayout({
    width,
    height,
    family,
    content: data.content,
    designTokens: data.designTokens,
    slots: data.slots,
  });

  const overrides = getVariantOverrides(data, variant.sizeId);
  const mergedZIndex = { ...computed.zIndex };

  const layers: ClassicBannerResolvedLayer[] = CLASSIC_EDITABLE_SLOTS.map((slotId) => {
    const slotOverride = overrides[slotId];
    const baseRect = rectFromComputed(computed, slotId);
    const rect = mergeRect(slotId, baseRect, slotOverride);
    const zIndex = slotOverride?.zIndex ?? computed.zIndex[slotId];
    mergedZIndex[slotId] = zIndex;

    return {
      slotId,
      rect,
      zIndex,
      visible: slotOverride?.visible ?? defaultLayerVisible(data, computed, slotId),
      locked: slotOverride?.locked ?? false,
      rotationDeg: mergeRotation(slotOverride),
      hasOverride: hasAnyOverride(slotOverride),
    };
  });

  layers.sort((a, b) => a.zIndex - b.zIndex);

  const layerBySlot = layers.reduce(
    (acc, layer) => {
      acc[layer.slotId] = layer;
      return acc;
    },
    {} as Record<ClassicEditableSlotId, ClassicBannerResolvedLayer>,
  );

  return {
    ...computed,
    logo: layerBySlot.logo.rect,
    headline: layerBySlot.headline.rect,
    slogan: layerBySlot.slogan.rect,
    hero: layerBySlot.hero.rect,
    cta: layerBySlot.cta.rect,
    badge: layerBySlot.badge.rect,
    zIndex: mergedZIndex,
    layers,
    layerBySlot,
  };
}

function withVariantOverrides(
  data: ClassicBannerProjectData,
  sizeId: string,
  nextForSize: ClassicBannerVariantOverrides | undefined,
): ClassicBannerProjectData {
  const current = { ...(data.variantOverrides ?? {}) };
  if (!nextForSize || Object.keys(nextForSize).length === 0) {
    delete current[sizeId];
  } else {
    current[sizeId] = nextForSize;
  }
  const variantOverrides = Object.keys(current).length > 0 ? current : undefined;
  return { ...data, variantOverrides };
}

export function patchClassicBannerLayerOverride(
  data: ClassicBannerProjectData,
  sizeId: string,
  slotId: ClassicEditableSlotId,
  patch: Partial<ClassicBannerLayerOverride>,
): ClassicBannerProjectData {
  const sizeOverrides = { ...getVariantOverrides(data, sizeId) };
  const existing = { ...(sizeOverrides[slotId] ?? {}) };

  if (patch.rect) {
    existing.rect = { ...(existing.rect ?? {}), ...patch.rect };
  }
  if (patch.zIndex !== undefined) existing.zIndex = patch.zIndex;
  if (patch.visible !== undefined) existing.visible = patch.visible;
  if (patch.locked !== undefined) existing.locked = patch.locked;
  if (patch.rotationDeg !== undefined) {
    existing.rotationDeg = clampClassicBannerRotation(patch.rotationDeg);
  }

  sizeOverrides[slotId] = existing;
  return withVariantOverrides(data, sizeId, sizeOverrides);
}

export function resetClassicBannerLayerOverride(
  data: ClassicBannerProjectData,
  sizeId: string,
  slotId: ClassicEditableSlotId,
): ClassicBannerProjectData {
  const sizeOverrides = { ...getVariantOverrides(data, sizeId) };
  delete sizeOverrides[slotId];
  return withVariantOverrides(data, sizeId, sizeOverrides);
}

export function resetClassicBannerVariantOverrides(
  data: ClassicBannerProjectData,
  sizeId: string,
): ClassicBannerProjectData {
  return withVariantOverrides(data, sizeId, undefined);
}

export function resetAllClassicBannerVariantOverrides(
  data: ClassicBannerProjectData,
): ClassicBannerProjectData {
  return { ...data, variantOverrides: undefined };
}

export type ClassicLayerReorderAction =
  | "forward"
  | "backward"
  | "front"
  | "back";

export interface ClassicLayerReorderState {
  isFrontmost: boolean;
  isBackmost: boolean;
  canReorder: boolean;
}

export function getClassicLayerReorderState(
  finalLayout: ClassicBannerFinalLayout,
  slotId: ClassicEditableSlotId,
): ClassicLayerReorderState {
  const layer = finalLayout.layerBySlot[slotId];
  if (!layer) {
    return { isFrontmost: true, isBackmost: true, canReorder: false };
  }

  if (slotId === "background" || layer.locked) {
    return { isFrontmost: false, isBackmost: true, canReorder: false };
  }

  const reorderable = [...finalLayout.layers]
    .filter((item) => item.slotId !== "background")
    .sort((a, b) => a.zIndex - b.zIndex);
  const index = reorderable.findIndex((item) => item.slotId === slotId);
  if (index < 0) {
    return { isFrontmost: true, isBackmost: true, canReorder: false };
  }

  return {
    isFrontmost: index === reorderable.length - 1,
    isBackmost: index === 0,
    canReorder: true,
  };
}

export function moveClassicLayerForward(
  data: ClassicBannerProjectData,
  variant: ClassicBannerSizeVariant,
  slotId: ClassicEditableSlotId,
): ClassicBannerProjectData {
  return reorderClassicBannerLayer(data, variant, slotId, "forward");
}

export function moveClassicLayerBackward(
  data: ClassicBannerProjectData,
  variant: ClassicBannerSizeVariant,
  slotId: ClassicEditableSlotId,
): ClassicBannerProjectData {
  return reorderClassicBannerLayer(data, variant, slotId, "backward");
}

export function bringClassicLayerToFront(
  data: ClassicBannerProjectData,
  variant: ClassicBannerSizeVariant,
  slotId: ClassicEditableSlotId,
): ClassicBannerProjectData {
  return reorderClassicBannerLayer(data, variant, slotId, "front");
}

export function sendClassicLayerToBack(
  data: ClassicBannerProjectData,
  variant: ClassicBannerSizeVariant,
  slotId: ClassicEditableSlotId,
): ClassicBannerProjectData {
  return reorderClassicBannerLayer(data, variant, slotId, "back");
}

export function reorderClassicBannerLayer(
  data: ClassicBannerProjectData,
  variant: ClassicBannerSizeVariant,
  slotId: ClassicEditableSlotId,
  action: ClassicLayerReorderAction,
): ClassicBannerProjectData {
  if (slotId === "background") return data;

  const final = resolveClassicBannerFinalLayout(data, variant);
  const layer = final.layerBySlot[slotId];
  if (layer?.locked) return data;

  const background = final.layers.find((item) => item.slotId === "background");
  const reorderable = [...final.layers]
    .filter((item) => item.slotId !== "background")
    .sort((a, b) => a.zIndex - b.zIndex);

  const index = reorderable.findIndex((item) => item.slotId === slotId);
  if (index < 0) return data;

  let targetIndex = index;
  if (action === "forward") targetIndex = Math.min(index + 1, reorderable.length - 1);
  else if (action === "backward") targetIndex = Math.max(index - 1, 0);
  else if (action === "front") targetIndex = reorderable.length - 1;
  else if (action === "back") targetIndex = 0;

  if (targetIndex === index) return data;

  const nextReorderable = [...reorderable];
  const [moved] = nextReorderable.splice(index, 1);
  nextReorderable.splice(targetIndex, 0, moved!);

  const stacked = background ? [background, ...nextReorderable] : nextReorderable;

  let next = data;
  for (let i = 0; i < stacked.length; i += 1) {
    const stackedLayer = stacked[i]!;
    const newZ = i;
    if (stackedLayer.zIndex === newZ && !stackedLayer.hasOverride) continue;
    next = patchClassicBannerLayerOverride(next, variant.sizeId, stackedLayer.slotId, {
      zIndex: newZ,
    });
  }

  return next;
}

export function variantHasManualOverrides(
  data: ClassicBannerProjectData,
  sizeId: string,
): boolean {
  const overrides = getVariantOverrides(data, sizeId);
  return Object.values(overrides).some(hasAnyOverride);
}

export function classicBannerSlotHasRectOverride(
  data: ClassicBannerProjectData,
  sizeId: string,
  slotId: ClassicEditableSlotId,
): boolean {
  return getVariantOverrides(data, sizeId)[slotId]?.rect !== undefined;
}
