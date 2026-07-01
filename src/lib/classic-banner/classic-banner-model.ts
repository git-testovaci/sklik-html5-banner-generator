import type { BannerProject, ProjectKind } from "@/types/project";
import type {
  ClassicBannerLayoutFamily,
  ClassicBannerProjectData,
  ClassicBannerSlotId,
  ClassicBannerVariantOverrides,
  ClassicBannerVariantStatus,
  ClassicEditableSlotId,
} from "@/types/classic-banner";

export const PROJECT_KIND_HTML5: ProjectKind = "html5-banner";
export const PROJECT_KIND_CLASSIC: ProjectKind = "classic-banner";

/** Resolve project kind — missing kind means legacy HTML5 banner. */
export function projectKindOf(project: BannerProject): ProjectKind {
  return project.projectKind ?? PROJECT_KIND_HTML5;
}

export function isHtml5BannerProject(project: BannerProject): boolean {
  return projectKindOf(project) === PROJECT_KIND_HTML5;
}

export function isClassicBannerProject(project: BannerProject): boolean {
  return projectKindOf(project) === PROJECT_KIND_CLASSIC;
}

export function getClassicBannerData(
  project: BannerProject,
): ClassicBannerProjectData | undefined {
  if (!isClassicBannerProject(project)) return undefined;
  return project.classicBanner;
}

const LAYOUT_FAMILIES: ClassicBannerLayoutFamily[] = [
  "vertical",
  "square",
  "landscape",
  "mobile",
  "portrait",
  "interscroller",
];

function asLayoutFamily(value: unknown): ClassicBannerLayoutFamily {
  return LAYOUT_FAMILIES.includes(value as ClassicBannerLayoutFamily)
    ? (value as ClassicBannerLayoutFamily)
    : "landscape";
}

function asVariantStatus(value: unknown): ClassicBannerVariantStatus {
  if (value === "master" || value === "derived") return value;
  return "placeholder";
}

const SLOT_IDS: ClassicBannerSlotId[] = [
  "background",
  "logo",
  "headline",
  "slogan",
  "hero",
  "cta",
  "badge",
  "decoration",
];

/** Migrate stored classic banner JSON — returns undefined if invalid. */
export function migrateClassicBannerData(
  value: unknown,
): ClassicBannerProjectData | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.masterSizeId !== "string") return undefined;
  if (!record.content || typeof record.content !== "object") return undefined;
  if (!record.designTokens || typeof record.designTokens !== "object") return undefined;
  if (!Array.isArray(record.variants)) return undefined;

  const content = record.content as Record<string, unknown>;
  const tokens = record.designTokens as Record<string, unknown>;

  return {
    masterSizeId: record.masterSizeId,
    content: {
      backgroundUrl: String(content.backgroundUrl ?? ""),
      logoUrl: String(content.logoUrl ?? ""),
      headline: String(content.headline ?? ""),
      slogan: String(content.slogan ?? ""),
      heroImageUrl: String(content.heroImageUrl ?? ""),
      ctaText: String(content.ctaText ?? ""),
      badgeText: String(content.badgeText ?? ""),
      backgroundAssetId:
        typeof content.backgroundAssetId === "string" ? content.backgroundAssetId : undefined,
      logoAssetId: typeof content.logoAssetId === "string" ? content.logoAssetId : undefined,
      heroAssetId: typeof content.heroAssetId === "string" ? content.heroAssetId : undefined,
    },
    designTokens: {
      fontFamily: String(tokens.fontFamily ?? "system-ui, sans-serif"),
      headlineFontWeight: Number(tokens.headlineFontWeight ?? 700),
      bodyFontWeight: Number(tokens.bodyFontWeight ?? 400),
      primaryColor: String(tokens.primaryColor ?? "#1e3a5f"),
      accentColor: String(tokens.accentColor ?? "#7c3aed"),
      textColor: String(tokens.textColor ?? "#ffffff"),
      ctaBackgroundColor: String(tokens.ctaBackgroundColor ?? "#7c3aed"),
      ctaTextColor: String(tokens.ctaTextColor ?? "#ffffff"),
      badgeBackgroundColor: String(tokens.badgeBackgroundColor ?? "#ef4444"),
      badgeTextColor: String(tokens.badgeTextColor ?? "#ffffff"),
      borderRadius: Number(tokens.borderRadius ?? 6),
      spacingScale: Number(tokens.spacingScale ?? 1),
      logoPositionPreset:
        tokens.logoPositionPreset === "top-center" ||
        tokens.logoPositionPreset === "top-right"
          ? tokens.logoPositionPreset
          : "top-left",
    },
    slots: Array.isArray(record.slots)
      ? (record.slots as Array<{ id?: string; visible?: boolean; label?: string }>)
          .filter((s) => s.id && SLOT_IDS.includes(s.id as ClassicBannerSlotId))
          .map((s) => ({
            id: s.id as ClassicBannerSlotId,
            visible: Boolean(s.visible),
            label: String(s.label ?? s.id),
          }))
      : [],
    variants: (record.variants as Array<Record<string, unknown>>).map((v) => ({
      sizeId: String(v.sizeId ?? ""),
      width: Number(v.width ?? 0),
      height: Number(v.height ?? 0),
      family: asLayoutFamily(v.family),
      status: asVariantStatus(v.status),
      layout: {
        family: asLayoutFamily((v.layout as { family?: unknown })?.family ?? v.family),
        status: (v.layout as { status?: string })?.status === "ready" ? "ready" : "pending",
      },
    })),
    variantOverrides: migrateVariantOverrides(record.variantOverrides),
  };
}

function migrateVariantOverrides(
  value: unknown,
): ClassicBannerProjectData["variantOverrides"] {
  if (!value || typeof value !== "object") return undefined;
  const result: Record<string, ClassicBannerVariantOverrides> = {};
  for (const [sizeId, slots] of Object.entries(value as Record<string, unknown>)) {
    if (!slots || typeof slots !== "object") continue;
    const slotMap: ClassicBannerVariantOverrides = {};
    for (const [slotId, override] of Object.entries(slots as Record<string, unknown>)) {
      if (!override || typeof override !== "object") continue;
      const o = override as Record<string, unknown>;
      const rectRaw = o.rect;
      const rect =
        rectRaw && typeof rectRaw === "object"
          ? {
              left: typeof (rectRaw as { left?: unknown }).left === "number"
                ? (rectRaw as { left: number }).left
                : undefined,
              top: typeof (rectRaw as { top?: unknown }).top === "number"
                ? (rectRaw as { top: number }).top
                : undefined,
              width: typeof (rectRaw as { width?: unknown }).width === "number"
                ? (rectRaw as { width: number }).width
                : undefined,
              height: typeof (rectRaw as { height?: unknown }).height === "number"
                ? (rectRaw as { height: number }).height
                : undefined,
            }
          : undefined;
      slotMap[slotId as ClassicEditableSlotId] = {
        rect,
        zIndex: typeof o.zIndex === "number" ? o.zIndex : undefined,
        visible: typeof o.visible === "boolean" ? o.visible : undefined,
        locked: typeof o.locked === "boolean" ? o.locked : undefined,
      };
    }
    if (Object.keys(slotMap).length > 0) {
      result[sizeId] = slotMap;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function isValidProjectKind(value: unknown): value is ProjectKind {
  return value === "html5-banner" || value === "classic-banner";
}

export function parseProjectKind(value: unknown): ProjectKind | undefined {
  return isValidProjectKind(value) ? value : undefined;
}
