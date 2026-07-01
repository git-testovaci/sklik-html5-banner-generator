import { CLASSIC_EDITABLE_SLOTS } from "@/lib/classic-banner/classic-banner-selection";
import {
  clampClassicBannerRect,
  resolveClassicBannerFinalLayout,
  variantHasManualOverrides,
} from "@/lib/classic-banner/classic-banner-overrides";
import {
  computeClassicBannerLayout,
  type ClassicBannerLayoutRect,
} from "@/lib/classic-banner/classic-banner-layout";
import type {
  ClassicBannerLayerOverride,
  ClassicBannerLayoutFamily,
  ClassicBannerProjectData,
  ClassicBannerPropagationTransformMode,
  ClassicBannerSizeVariant,
  ClassicBannerVariantOverrides,
  ClassicEditableSlotId,
} from "@/types/classic-banner";

export type ClassicBannerPropagationTargetMode = "same-family" | "selected-sizes" | "all";

export type { ClassicBannerPropagationTransformMode };

export interface ClassicBannerPropagationOptions {
  targetMode: ClassicBannerPropagationTargetMode;
  selectedSizeIds?: string[];
  /** Default false — skip targets that already have manual overrides for the same slot. */
  overwriteExisting?: boolean;
  /** If omitted, uses all manually edited slots on the source variant. */
  slots?: ClassicEditableSlotId[];
  /** How rect overrides are mapped onto target variants. */
  transformMode?: ClassicBannerPropagationTransformMode;
}

export interface ClassicBannerPropagationTarget {
  variant: ClassicBannerSizeVariant;
  sizeId: string;
  family: ClassicBannerLayoutFamily;
  hasManualOverrides: boolean;
}

export interface ClassicBannerPropagationResult {
  data: ClassicBannerProjectData;
  updatedTargetCount: number;
  appliedSlotCount: number;
  skippedSlotCount: number;
  targetCount: number;
  message: string;
}

function layerHasManualOverride(override?: ClassicBannerLayerOverride): boolean {
  if (!override) return false;
  return (
    override.rect !== undefined ||
    override.zIndex !== undefined ||
    override.visible !== undefined ||
    override.locked === true ||
    override.rotationDeg !== undefined
  );
}

function copyLayerOverride(source: ClassicBannerLayerOverride): ClassicBannerLayerOverride {
  return {
    rect: source.rect ? { ...source.rect } : undefined,
    zIndex: source.zIndex,
    visible: source.visible,
    locked: source.locked,
    rotationDeg: source.rotationDeg,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeBaseRect(
  data: ClassicBannerProjectData,
  variant: ClassicBannerSizeVariant,
  slotId: ClassicEditableSlotId,
): ClassicBannerLayoutRect {
  const computed = computeClassicBannerLayout({
    width: variant.width,
    height: variant.height,
    family: variant.family,
    content: data.content,
    designTokens: data.designTokens,
    slots: data.slots,
  });
  if (slotId === "background") {
    return { left: 0, top: 0, width: 100, height: 100 };
  }
  return { ...computed[slotId] };
}

function clampSlotScales(
  slotId: ClassicEditableSlotId,
  scaleW: number,
  scaleH: number,
): { scaleW: number; scaleH: number } {
  switch (slotId) {
    case "logo":
    case "hero":
      return { scaleW: clamp(scaleW, 0.5, 2), scaleH: clamp(scaleH, 0.5, 2) };
    case "cta":
    case "badge":
      return { scaleW: clamp(scaleW, 0.6, 1.8), scaleH: clamp(scaleH, 0.6, 1.8) };
    case "headline":
    case "slogan":
      return { scaleW: clamp(scaleW, 0.5, 2.5), scaleH: clamp(scaleH, 0.5, 2.5) };
    default:
      return { scaleW: clamp(scaleW, 0.4, 2.5), scaleH: clamp(scaleH, 0.4, 2.5) };
  }
}

function slotMinDimensions(slotId: ClassicEditableSlotId): {
  minWidth: number;
  minHeight: number;
} {
  switch (slotId) {
    case "logo":
    case "hero":
      return { minWidth: 5, minHeight: 5 };
    case "cta":
    case "badge":
      return { minWidth: 8, minHeight: 4 };
    case "headline":
    case "slogan":
      return { minWidth: 12, minHeight: 4 };
    default:
      return { minWidth: 2, minHeight: 2 };
  }
}

function clampSlotRect(
  slotId: ClassicEditableSlotId,
  rect: ClassicBannerLayoutRect,
): ClassicBannerLayoutRect {
  const { minWidth, minHeight } = slotMinDimensions(slotId);
  const clamped = clampClassicBannerRect(rect);
  return clampClassicBannerRect({
    ...clamped,
    width: Math.max(clamped.width, minWidth),
    height: Math.max(clamped.height, minHeight),
  });
}

function remapRectFamilyAware(
  slotId: ClassicEditableSlotId,
  sourceBase: ClassicBannerLayoutRect,
  sourceFinal: ClassicBannerLayoutRect,
  targetBase: ClassicBannerLayoutRect,
  sameFamily: boolean,
): ClassicBannerLayoutRect {
  const deltaFactor = sameFamily ? 1 : 0.85;
  const deltaLeft = (sourceFinal.left - sourceBase.left) * deltaFactor;
  const deltaTop = (sourceFinal.top - sourceBase.top) * deltaFactor;
  const rawScaleW = sourceBase.width > 0.01 ? sourceFinal.width / sourceBase.width : 1;
  const rawScaleH = sourceBase.height > 0.01 ? sourceFinal.height / sourceBase.height : 1;
  const { scaleW, scaleH } = clampSlotScales(slotId, rawScaleW, rawScaleH);

  return clampSlotRect(slotId, {
    left: targetBase.left + deltaLeft,
    top: targetBase.top + deltaTop,
    width: targetBase.width * scaleW,
    height: targetBase.height * scaleH,
  });
}

function resolveTransformMode(
  options: ClassicBannerPropagationOptions,
  sourceVariant: ClassicBannerSizeVariant,
  targets: ClassicBannerSizeVariant[],
): ClassicBannerPropagationTransformMode {
  if (options.transformMode) return options.transformMode;
  if (options.targetMode === "all") return "family-aware";
  if (options.targetMode === "selected-sizes") {
    const hasCrossFamily = targets.some((target) => target.family !== sourceVariant.family);
    return hasCrossFamily ? "family-aware" : "copy-percent";
  }
  return "copy-percent";
}

function rectsDiffer(
  a: ClassicBannerLayoutRect,
  b: ClassicBannerLayoutRect,
  epsilon = 0.05,
): boolean {
  return (
    Math.abs(a.left - b.left) > epsilon ||
    Math.abs(a.top - b.top) > epsilon ||
    Math.abs(a.width - b.width) > epsilon ||
    Math.abs(a.height - b.height) > epsilon
  );
}

function shouldPropagateRect(
  data: ClassicBannerProjectData,
  sourceVariant: ClassicBannerSizeVariant,
  slotId: ClassicEditableSlotId,
  sourceSlot: ClassicBannerLayerOverride,
): boolean {
  if (sourceSlot.rect !== undefined) return true;
  const base = computeBaseRect(data, sourceVariant, slotId);
  const final = resolveClassicBannerFinalLayout(data, sourceVariant).layerBySlot[slotId].rect;
  return rectsDiffer(base, final);
}

function transformLayerOverrideForTarget(
  data: ClassicBannerProjectData,
  sourceVariant: ClassicBannerSizeVariant,
  targetVariant: ClassicBannerSizeVariant,
  slotId: ClassicEditableSlotId,
  sourceSlot: ClassicBannerLayerOverride,
  transformMode: ClassicBannerPropagationTransformMode,
): ClassicBannerLayerOverride {
  const copied = copyLayerOverride(sourceSlot);

  if (!shouldPropagateRect(data, sourceVariant, slotId, sourceSlot)) {
    delete copied.rect;
    return copied;
  }

  const sourceFinal = resolveClassicBannerFinalLayout(data, sourceVariant);
  const sourceFinalRect = sourceFinal.layerBySlot[slotId].rect;

  if (transformMode === "copy-percent") {
    copied.rect = { ...sourceFinalRect };
    return copied;
  }

  const sourceBase = computeBaseRect(data, sourceVariant, slotId);
  const targetBase = computeBaseRect(data, targetVariant, slotId);
  const sameFamily = sourceVariant.family === targetVariant.family;
  copied.rect = remapRectFamilyAware(
    slotId,
    sourceBase,
    sourceFinalRect,
    targetBase,
    sameFamily,
  );
  return copied;
}

/** Default selected-size targets for a source variant (same-family, excludes source). */
export function getDefaultPropagationSelectedSizeIds(
  data: ClassicBannerProjectData,
  sourceVariant: ClassicBannerSizeVariant,
): string[] {
  return filterTargets(data, sourceVariant, "same-family").map((variant) => variant.sizeId);
}

/** Keep only valid target ids — excludes source and unknown sizes. */
export function sanitizePropagationSelectedSizeIds(
  data: ClassicBannerProjectData,
  sourceSizeId: string,
  selectedSizeIds: readonly string[],
): string[] {
  const valid = new Set(
    data.variants.map((variant) => variant.sizeId).filter((id) => id !== sourceSizeId),
  );
  return selectedSizeIds.filter((id) => valid.has(id));
}

export function suggestPropagationTransformMode(
  targetMode: ClassicBannerPropagationTargetMode,
  sourceVariant: ClassicBannerSizeVariant,
  targets: readonly ClassicBannerSizeVariant[],
): ClassicBannerPropagationTransformMode {
  if (targetMode === "all") return "family-aware";
  if (targetMode === "selected-sizes") {
    return targets.some((target) => target.family !== sourceVariant.family)
      ? "family-aware"
      : "copy-percent";
  }
  return "copy-percent";
}

function applyVariantOverridesMap(
  data: ClassicBannerProjectData,
  sizeId: string,
  overrides: ClassicBannerVariantOverrides,
): ClassicBannerProjectData {
  const current = { ...(data.variantOverrides ?? {}) };
  if (Object.keys(overrides).length === 0) {
    delete current[sizeId];
  } else {
    current[sizeId] = overrides;
  }
  return {
    ...data,
    variantOverrides: Object.keys(current).length > 0 ? current : undefined,
  };
}

function resolveSourceVariant(
  data: ClassicBannerProjectData,
  sourceSizeId: string,
): ClassicBannerSizeVariant | undefined {
  return data.variants.find((variant) => variant.sizeId === sourceSizeId);
}

function resolveSlotsToPropagate(
  data: ClassicBannerProjectData,
  sourceSizeId: string,
  slots?: ClassicEditableSlotId[],
): ClassicEditableSlotId[] {
  const sourceOverrides = data.variantOverrides?.[sourceSizeId] ?? {};
  if (slots && slots.length > 0) {
    return slots.filter((slotId) => layerHasManualOverride(sourceOverrides[slotId]));
  }
  return CLASSIC_EDITABLE_SLOTS.filter((slotId) =>
    layerHasManualOverride(sourceOverrides[slotId]),
  );
}

function filterTargets(
  data: ClassicBannerProjectData,
  sourceVariant: ClassicBannerSizeVariant,
  targetMode: ClassicBannerPropagationTargetMode,
  selectedSizeIds?: string[],
): ClassicBannerSizeVariant[] {
  const sourceSizeId = sourceVariant.sizeId;
  const sourceFamily = sourceVariant.family;

  return data.variants.filter((variant) => {
    if (variant.sizeId === sourceSizeId) return false;
    if (targetMode === "all") return true;
    if (targetMode === "selected-sizes") {
      const sanitized = sanitizePropagationSelectedSizeIds(
        data,
        sourceSizeId,
        selectedSizeIds ?? [],
      );
      return sanitized.includes(variant.sizeId);
    }
    return variant.family === sourceFamily;
  });
}

function formatPropagationMessage(
  updatedTargetCount: number,
  skippedSlotCount: number,
): string {
  const parts: string[] = [];
  if (updatedTargetCount > 0) {
    const label =
      updatedTargetCount === 1
        ? "Úpravy přeneseny na 1 rozměr."
        : `Úpravy přeneseny na ${updatedTargetCount} rozměry.`;
    parts.push(label);
  } else {
    parts.push("Žádné úpravy nebyly přeneseny.");
  }
  if (skippedSlotCount > 0) {
    const skipLabel =
      skippedSlotCount === 1
        ? "1 úprava přeskočena, protože už byla ručně upravená."
        : `${skippedSlotCount} úpravy přeskočeny, protože už byly ručně upravené.`;
    parts.push(skipLabel);
  }
  return parts.join(" ");
}

export interface ClassicBannerPropagationPreview {
  sourceSizeId: string;
  slotIds: ClassicEditableSlotId[];
  targetMode: ClassicBannerPropagationTargetMode;
  transformMode: ClassicBannerPropagationTransformMode;
  targetCount: number;
  overwriteExisting: boolean;
  potentialSkipCount: number;
  potentialApplyCount: number;
}

function countPropagationOutcome(
  data: ClassicBannerProjectData,
  sourceSizeId: string,
  sourceOverrides: ClassicBannerVariantOverrides,
  slotsToPropagate: ClassicEditableSlotId[],
  targets: ClassicBannerSizeVariant[],
  overwrite: boolean,
): { potentialSkipCount: number; potentialApplyCount: number } {
  let potentialSkipCount = 0;
  let potentialApplyCount = 0;

  for (const target of targets) {
    const targetOverrides = data.variantOverrides?.[target.sizeId] ?? {};
    for (const slotId of slotsToPropagate) {
      if (!layerHasManualOverride(sourceOverrides[slotId])) continue;
      const existing = targetOverrides[slotId];
      if (!overwrite && layerHasManualOverride(existing)) {
        potentialSkipCount += 1;
      } else {
        potentialApplyCount += 1;
      }
    }
  }

  return { potentialSkipCount, potentialApplyCount };
}

/** Pre-apply summary for propagation UI. */
export function previewClassicBannerPropagation(
  data: ClassicBannerProjectData,
  sourceSizeId: string,
  options: ClassicBannerPropagationOptions,
): ClassicBannerPropagationPreview | null {
  const sourceVariant = resolveSourceVariant(data, sourceSizeId);
  if (!sourceVariant) return null;

  const slotsToPropagate = resolveSlotsToPropagate(data, sourceSizeId, options.slots);
  const targets = filterTargets(
    data,
    sourceVariant,
    options.targetMode,
    options.selectedSizeIds,
  );
  const overwrite = options.overwriteExisting ?? false;
  const sourceOverrides = data.variantOverrides?.[sourceSizeId] ?? {};
  const transformMode = resolveTransformMode(options, sourceVariant, targets);
  const { potentialSkipCount, potentialApplyCount } = countPropagationOutcome(
    data,
    sourceSizeId,
    sourceOverrides,
    slotsToPropagate,
    targets,
    overwrite,
  );

  return {
    sourceSizeId,
    slotIds: slotsToPropagate,
    targetMode: options.targetMode,
    transformMode,
    targetCount: targets.length,
    overwriteExisting: overwrite,
    potentialSkipCount,
    potentialApplyCount,
  };
}

export interface ClassicBannerResetSimilarOptions {
  targetMode?: ClassicBannerPropagationTargetMode;
  selectedSizeIds?: string[];
  slots?: ClassicEditableSlotId[];
}

export interface ClassicBannerResetSimilarResult {
  data: ClassicBannerProjectData;
  resetVariantCount: number;
  resetSlotCount: number;
  message: string;
}

/** Remove manual overrides from target variants (never touches source). */
export function resetClassicBannerSimilarOverrides(
  data: ClassicBannerProjectData,
  sourceSizeId: string,
  options: ClassicBannerResetSimilarOptions = {},
): ClassicBannerResetSimilarResult {
  const sourceVariant = resolveSourceVariant(data, sourceSizeId);
  if (!sourceVariant) {
    return {
      data,
      resetVariantCount: 0,
      resetSlotCount: 0,
      message: "Zdrojový rozměr nebyl nalezen.",
    };
  }

  const targetMode = options.targetMode ?? "same-family";
  const targets = filterTargets(data, sourceVariant, targetMode, options.selectedSizeIds);
  if (targets.length === 0) {
    return {
      data,
      resetVariantCount: 0,
      resetSlotCount: 0,
      message: "Nebyly nalezeny žádné cílové rozměry.",
    };
  }

  const slotsFilter = options.slots;
  let next = data;
  let resetVariantCount = 0;
  let resetSlotCount = 0;

  for (const target of targets) {
    const targetSizeId = target.sizeId;
    const sizeOverrides = { ...(next.variantOverrides?.[targetSizeId] ?? {}) };
    if (Object.keys(sizeOverrides).length === 0) continue;

    let variantChanged = false;

    if (slotsFilter && slotsFilter.length > 0) {
      for (const slotId of slotsFilter) {
        if (!sizeOverrides[slotId]) continue;
        delete sizeOverrides[slotId];
        resetSlotCount += 1;
        variantChanged = true;
      }
    } else {
      const removed = Object.keys(sizeOverrides).length;
      if (removed > 0) {
        resetSlotCount += removed;
        variantChanged = true;
        next = applyVariantOverridesMap(next, targetSizeId, {});
        continue;
      }
    }

    if (variantChanged) {
      next = applyVariantOverridesMap(next, targetSizeId, sizeOverrides);
      resetVariantCount += 1;
    }
  }

  const message =
    resetVariantCount > 0
      ? resetVariantCount === 1
        ? "Ruční úpravy resetovány na 1 cílovém rozměru."
        : `Ruční úpravy resetovány na ${resetVariantCount} cílových rozměrech.`
      : "Na cílových rozměrech nebyly žádné ruční úpravy k resetu.";

  return { data: next, resetVariantCount, resetSlotCount, message };
}

export function getClassicBannerSourcePropagationSlots(
  data: ClassicBannerProjectData,
  sourceSizeId: string,
  slots?: ClassicEditableSlotId[],
): ClassicEditableSlotId[] {
  return resolveSlotsToPropagate(data, sourceSizeId, slots);
}

/** Resolve target variants for propagation preview (excludes source). */
export function getClassicBannerPropagationTargets(
  data: ClassicBannerProjectData,
  sourceVariant: ClassicBannerSizeVariant,
  targetMode: ClassicBannerPropagationTargetMode,
  selectedSizeIds?: string[],
): ClassicBannerPropagationTarget[] {
  return filterTargets(data, sourceVariant, targetMode, selectedSizeIds).map((variant) => ({
    variant,
    sizeId: variant.sizeId,
    family: variant.family,
    hasManualOverrides: variantHasManualOverrides(data, variant.sizeId),
  }));
}

/** Copy normalized manual overrides from source variant to target variants. */
export function propagateClassicBannerOverrides(
  data: ClassicBannerProjectData,
  sourceSizeId: string,
  options: ClassicBannerPropagationOptions,
): ClassicBannerPropagationResult {
  const sourceVariant = resolveSourceVariant(data, sourceSizeId);
  if (!sourceVariant) {
    return {
      data,
      updatedTargetCount: 0,
      appliedSlotCount: 0,
      skippedSlotCount: 0,
      targetCount: 0,
      message: "Zdrojový rozměr nebyl nalezen.",
    };
  }

  const slotsToPropagate = resolveSlotsToPropagate(data, sourceSizeId, options.slots);
  if (slotsToPropagate.length === 0) {
    return {
      data,
      updatedTargetCount: 0,
      appliedSlotCount: 0,
      skippedSlotCount: 0,
      targetCount: 0,
      message: "Na zdrojovém rozměru nejsou žádné ruční úpravy k přenesení.",
    };
  }

  const targets = filterTargets(
    data,
    sourceVariant,
    options.targetMode,
    options.selectedSizeIds,
  );
  if (targets.length === 0) {
    return {
      data,
      updatedTargetCount: 0,
      appliedSlotCount: 0,
      skippedSlotCount: 0,
      targetCount: 0,
      message: "Nebyly nalezeny žádné cílové rozměry.",
    };
  }

  const sourceOverrides = data.variantOverrides?.[sourceSizeId] ?? {};
  const overwrite = options.overwriteExisting ?? false;
  const transformMode = resolveTransformMode(options, sourceVariant, targets);

  let next = data;
  let updatedTargetCount = 0;
  let appliedSlotCount = 0;
  let skippedSlotCount = 0;

  for (const target of targets) {
    const targetSizeId = target.sizeId;
    const sizeOverrides = { ...(next.variantOverrides?.[targetSizeId] ?? {}) };
    let targetChanged = false;

    for (const slotId of slotsToPropagate) {
      const sourceSlot = sourceOverrides[slotId];
      if (!layerHasManualOverride(sourceSlot)) continue;

      const existing = sizeOverrides[slotId];
      if (!overwrite && layerHasManualOverride(existing)) {
        skippedSlotCount += 1;
        continue;
      }

      sizeOverrides[slotId] = transformLayerOverrideForTarget(
        data,
        sourceVariant,
        target,
        slotId,
        sourceSlot!,
        transformMode,
      );
      appliedSlotCount += 1;
      targetChanged = true;
    }

    if (targetChanged) {
      next = applyVariantOverridesMap(next, targetSizeId, sizeOverrides);
      updatedTargetCount += 1;
    }
  }

  return {
    data: next,
    updatedTargetCount,
    appliedSlotCount,
    skippedSlotCount,
    targetCount: targets.length,
    message: formatPropagationMessage(updatedTargetCount, skippedSlotCount),
  };
}
