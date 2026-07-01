import { CLASSIC_EDITABLE_SLOTS } from "@/lib/classic-banner/classic-banner-selection";
import { variantHasManualOverrides } from "@/lib/classic-banner/classic-banner-overrides";
import type {
  ClassicBannerLayerOverride,
  ClassicBannerLayoutFamily,
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicBannerVariantOverrides,
  ClassicEditableSlotId,
} from "@/types/classic-banner";

export type ClassicBannerPropagationTargetMode = "same-family" | "selected-sizes" | "all";

export interface ClassicBannerPropagationOptions {
  targetMode: ClassicBannerPropagationTargetMode;
  selectedSizeIds?: string[];
  /** Default false — skip targets that already have manual overrides for the same slot. */
  overwriteExisting?: boolean;
  /** If omitted, uses all manually edited slots on the source variant. */
  slots?: ClassicEditableSlotId[];
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
    override.locked === true
  );
}

function copyLayerOverride(source: ClassicBannerLayerOverride): ClassicBannerLayerOverride {
  return {
    rect: source.rect ? { ...source.rect } : undefined,
    zIndex: source.zIndex,
    visible: source.visible,
    locked: source.locked,
  };
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
      return selectedSizeIds?.includes(variant.sizeId) ?? false;
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

/** Slots on the source variant that would be propagated (respects optional slot filter). */
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

      sizeOverrides[slotId] = copyLayerOverride(sourceSlot!);
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
