import type {
  ClassicBannerContent,
  ClassicBannerDesignTokens,
  ClassicBannerProjectData,
  ClassicBannerSlot,
  ClassicBannerSlotId,
} from "@/types/classic-banner";
import type { BannerProject } from "@/types/project";
import { getClassicBannerSizeById } from "./classic-banner-sizes";

export function patchClassicBannerContent(
  data: ClassicBannerProjectData,
  patch: Partial<ClassicBannerContent>,
): ClassicBannerProjectData {
  return {
    ...data,
    content: { ...data.content, ...patch },
  };
}

export function patchClassicBannerDesignTokens(
  data: ClassicBannerProjectData,
  patch: Partial<ClassicBannerDesignTokens>,
): ClassicBannerProjectData {
  return {
    ...data,
    designTokens: { ...data.designTokens, ...patch },
  };
}

export function setClassicBannerSlotVisible(
  data: ClassicBannerProjectData,
  slotId: ClassicBannerSlotId,
  visible: boolean,
): ClassicBannerProjectData {
  return {
    ...data,
    slots: data.slots.map((slot) =>
      slot.id === slotId ? { ...slot, visible } : slot,
    ),
  };
}

export function isClassicBannerSlotVisible(
  data: ClassicBannerProjectData,
  slotId: ClassicBannerSlotId,
): boolean {
  return data.slots.find((slot) => slot.id === slotId)?.visible ?? false;
}

/** Sync classic payload into BannerProject top-level fields used by dashboard/cards. */
export function mergeClassicBannerIntoProject(
  project: BannerProject,
  classicBanner: ClassicBannerProjectData,
): BannerProject {
  const { content, designTokens, masterSizeId } = classicBanner;
  const master = getClassicBannerSizeById(masterSizeId);

  return {
    ...project,
    projectKind: "classic-banner",
    classicBanner,
    headline: content.headline,
    subheadline: content.slogan,
    cta: content.ctaText,
    backgroundColor: designTokens.primaryColor,
    textColor: designTokens.textColor,
    ctaBackgroundColor: designTokens.ctaBackgroundColor,
    ctaTextColor: designTokens.ctaTextColor,
    accentColor: designTokens.accentColor,
    width: master?.width ?? project.width,
    height: master?.height ?? project.height,
    updatedAt: new Date().toISOString(),
  };
}

function slotsEqual(a: ClassicBannerSlot[], b: ClassicBannerSlot[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (slot, index) =>
      slot.id === b[index]?.id &&
      slot.visible === b[index]?.visible &&
      slot.label === b[index]?.label,
  );
}

export function classicBannerDataEqual(
  a: ClassicBannerProjectData,
  b: ClassicBannerProjectData,
): boolean {
  return (
    a.masterSizeId === b.masterSizeId &&
    JSON.stringify(a.content) === JSON.stringify(b.content) &&
    JSON.stringify(a.designTokens) === JSON.stringify(b.designTokens) &&
    slotsEqual(a.slots, b.slots)
  );
}
