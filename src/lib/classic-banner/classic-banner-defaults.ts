import type {
  ClassicBannerContent,
  ClassicBannerDesignTokens,
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicBannerSlot,
} from "@/types/classic-banner";
import {
  CLASSIC_BANNER_MASTER_SIZE_ID,
  CLASSIC_BANNER_SIZES,
  getClassicBannerSizeById,
} from "./classic-banner-sizes";

export const DEFAULT_CLASSIC_BANNER_CONTENT: ClassicBannerContent = {
  backgroundUrl: "https://www.stockvault.net/data/2011/04/28/122658/preview16.jpg",
  logoUrl: "https://www.mcmarketing.cz/templates/images/logo.png",
  headline: "Potřebujete zvýraznit\nVaši firmu v on-line světě?",
  slogan: "Jste na správném místě!",
  heroImageUrl: "https://storage.needpix.com/rsynced_images/smiley-154420_1280.png",
  ctaText: "Zjistit více",
  badgeText: "-20%",
};

export const DEFAULT_CLASSIC_BANNER_DESIGN_TOKENS: ClassicBannerDesignTokens = {
  fontFamily: "system-ui, sans-serif",
  headlineFontWeight: 700,
  bodyFontWeight: 400,
  primaryColor: "#1e3a5f",
  accentColor: "#7c3aed",
  textColor: "#ffffff",
  ctaBackgroundColor: "#7c3aed",
  ctaTextColor: "#ffffff",
  badgeBackgroundColor: "#ef4444",
  badgeTextColor: "#ffffff",
  borderRadius: 6,
  spacingScale: 1,
  logoPositionPreset: "top-left",
};

export const DEFAULT_CLASSIC_BANNER_SLOTS: ClassicBannerSlot[] = [
  { id: "background", visible: true, label: "Pozadí" },
  { id: "logo", visible: true, label: "Logo" },
  { id: "headline", visible: true, label: "Nadpis" },
  { id: "slogan", visible: true, label: "Slogan" },
  { id: "hero", visible: true, label: "Hero obrázek" },
  { id: "cta", visible: true, label: "Výzva k akci" },
  { id: "badge", visible: true, label: "Štítek" },
  { id: "decoration", visible: false, label: "Dekorace" },
];

export function defaultClassicProjectName(): string {
  const formatted = new Intl.DateTimeFormat("cs-CZ", {
    month: "short",
    year: "numeric",
  }).format(new Date());
  return `Klasický banner ${formatted}`;
}

function buildVariantEntries(masterSizeId: string): ClassicBannerSizeVariant[] {
  return CLASSIC_BANNER_SIZES.map((size) => ({
    sizeId: size.id,
    width: size.width,
    height: size.height,
    family: size.family,
    status: size.id === masterSizeId ? "master" : "placeholder",
    layout: {
      family: size.family,
      status: "pending",
    },
  }));
}

export function createDefaultClassicBannerData(
  masterSizeId = CLASSIC_BANNER_MASTER_SIZE_ID,
): ClassicBannerProjectData {
  const master = getClassicBannerSizeById(masterSizeId);
  if (!master) {
    throw new Error(`Unknown classic banner master size: ${masterSizeId}`);
  }

  return {
    masterSizeId,
    content: { ...DEFAULT_CLASSIC_BANNER_CONTENT },
    designTokens: { ...DEFAULT_CLASSIC_BANNER_DESIGN_TOKENS },
    slots: DEFAULT_CLASSIC_BANNER_SLOTS.map((slot) => ({ ...slot })),
    variants: buildVariantEntries(masterSizeId),
  };
}
