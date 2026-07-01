import {
  computeClassicBannerLayout,
  type ClassicBannerComputedLayout,
  type ClassicBannerLayoutRect,
} from "@/lib/classic-banner/classic-banner-layout";
import { hasClassicBannerImageSource } from "@/lib/classic-banner/classic-banner-image-sources";
import { isClassicBannerSlotVisible } from "@/lib/classic-banner/classic-banner-update";
import {
  CLASSIC_EDITABLE_SLOTS,
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
  hasOverride: boolean;
}

/** Final layout = computed base + per-variant overrides (preview & export SoT). */
export interface ClassicBannerFinalLayout extends ClassicBannerComputedLayout {
  layers: ClassicBannerResolvedLayer[];
  layerBySlot: Record<ClassicEditableSlotId, ClassicBannerResolvedLayer>;
}

const MIN_RECT_PERCENT = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampClassicBannerRect(rect: ClassicBannerLayoutRect): ClassicBannerLayoutRect {
  const width = clamp(rect.width, MIN_RECT_PERCENT, 100);
  const height = clamp(rect.height, MIN_RECT_PERCENT, 100);
  const left = clamp(rect.left, 0, 100 - width);
  const top = clamp(rect.top, 0, 100 - height);
  return { left, top, width, height };
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
  base: ClassicBannerLayoutRect,
  override?: ClassicBannerLayerOverride,
): ClassicBannerLayoutRect {
  if (!override?.rect) return base;
  return clampClassicBannerRect({
    left: override.rect.left ?? base.left,
    top: override.rect.top ?? base.top,
    width: override.rect.width ?? base.width,
    height: override.rect.height ?? base.height,
  });
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
      return isClassicBannerSlotVisible(data, "hero") && hasClassicBannerImageSource(content, "hero");
    case "cta":
      return isClassicBannerSlotVisible(data, "cta") && Boolean(content.ctaText.trim());
    case "badge":
      return isClassicBannerSlotVisible(data, "badge") && Boolean(content.badgeText.trim());
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
    override.locked === true
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
    const rect = mergeRect(baseRect, slotOverride);
    const zIndex = slotOverride?.zIndex ?? computed.zIndex[slotId];
    mergedZIndex[slotId] = zIndex;

    return {
      slotId,
      rect,
      zIndex,
      visible: slotOverride?.visible ?? defaultLayerVisible(data, computed, slotId),
      locked: slotOverride?.locked ?? false,
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

export function reorderClassicBannerLayer(
  data: ClassicBannerProjectData,
  variant: ClassicBannerSizeVariant,
  slotId: ClassicEditableSlotId,
  action: ClassicLayerReorderAction,
): ClassicBannerProjectData {
  const final = resolveClassicBannerFinalLayout(data, variant);
  const ordered = [...final.layers].sort((a, b) => a.zIndex - b.zIndex);
  const index = ordered.findIndex((layer) => layer.slotId === slotId);
  if (index < 0) return data;

  let targetIndex = index;
  if (action === "forward") targetIndex = Math.min(index + 1, ordered.length - 1);
  else if (action === "backward") targetIndex = Math.max(index - 1, 0);
  else if (action === "front") targetIndex = ordered.length - 1;
  else if (action === "back") targetIndex = 0;

  if (targetIndex === index) return data;

  const reordered = [...ordered];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, moved);

  let next = data;
  for (let i = 0; i < reordered.length; i += 1) {
    const layer = reordered[i]!;
    const newZ = i;
    if (layer.zIndex === newZ && !layer.hasOverride) continue;
    next = patchClassicBannerLayerOverride(next, variant.sizeId, layer.slotId, {
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
