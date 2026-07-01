import { generateShareId } from "@/lib/share-links";
import { defaultTimeline } from "@/lib/animation/timeline-utils";
import type { BannerProject } from "@/types/project";
import {
  createDefaultClassicBannerData,
  defaultClassicProjectName,
} from "./classic-banner-defaults";
import { getClassicBannerSizeById } from "./classic-banner-sizes";

export interface CreateClassicBannerProjectInput {
  name?: string;
  masterSizeId?: string;
}

export function createClassicBannerProject(
  input: CreateClassicBannerProjectInput = {},
): BannerProject {
  const classicBanner = createDefaultClassicBannerData(input.masterSizeId);
  const master = getClassicBannerSizeById(classicBanner.masterSizeId)!;
  const now = new Date().toISOString();
  const suffix = Math.random().toString(36).slice(2, 6);
  const tokens = classicBanner.designTokens;
  const content = classicBanner.content;

  return {
    id: `proj-${Date.now()}-${suffix}`,
    projectKind: "classic-banner",
    name: input.name?.trim() || defaultClassicProjectName(),
    status: "draft",
    width: master.width,
    height: master.height,
    headline: content.headline,
    subheadline: content.slogan,
    cta: content.ctaText,
    backgroundColor: tokens.primaryColor,
    textColor: tokens.textColor,
    ctaBackgroundColor: tokens.ctaBackgroundColor,
    ctaTextColor: tokens.ctaTextColor,
    accentColor: tokens.accentColor,
    animation: "none",
    logoLabel: "Logo",
    productImageLabel: "Hero",
    shareId: generateShareId(),
    createdAt: now,
    updatedAt: now,
    assets: [],
    timeline: defaultTimeline(),
    classicBanner,
  };
}
