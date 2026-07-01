import { computeClassicBannerLayout } from "@/lib/classic-banner/classic-banner-layout";
import { hasClassicBannerImageSource } from "@/lib/classic-banner/classic-banner-image-sources";
import { isClassicBannerSlotVisible } from "@/lib/classic-banner/classic-banner-update";
import type {
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
} from "@/types/classic-banner";

export type ClassicBannerRecommendationSeverity = "warning" | "info";

export interface ClassicBannerRecommendation {
  id: string;
  severity: ClassicBannerRecommendationSeverity;
  message: string;
}

function isMobileLikeVariant(variant: ClassicBannerSizeVariant | undefined): boolean {
  if (!variant) return false;
  return (
    variant.family === "mobile" ||
    variant.height <= 100 ||
    (variant.width >= 280 && variant.height <= 120)
  );
}

function isTinyHorizontal(variant: ClassicBannerSizeVariant | undefined): boolean {
  if (!variant) return false;
  return variant.height <= 60 || (variant.height <= 100 && variant.width <= 340);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function getClassicBannerRecommendations(
  data: ClassicBannerProjectData,
  variant?: ClassicBannerSizeVariant,
): ClassicBannerRecommendation[] {
  const items: ClassicBannerRecommendation[] = [];
  const { content } = data;
  const headlineLen = content.headline.replace(/\s+/g, " ").trim().length;
  const headlineWords = wordCount(content.headline.replace(/\n/g, " "));
  const ctaLen = content.ctaText.trim().length;
  const ctaWords = wordCount(content.ctaText);
  const badgeLen = content.badgeText.trim().length;
  const mobileLike = isMobileLikeVariant(variant);
  const tinyHorizontal = isTinyHorizontal(variant);

  if (mobileLike && headlineLen > 42) {
    items.push({
      id: "headline-mobile-long",
      severity: "warning",
      message: "Nadpis je pro tento malý formát příliš dlouhý — zkratte ho na 1–2 krátké řádky.",
    });
  } else if (headlineWords > 7) {
    items.push({
      id: "headline-many-words",
      severity: "info",
      message: "Nadpis má více než 7 slov — v menších formátech bude zmenšen nebo zkrácen.",
    });
  } else if (headlineLen > 72) {
    items.push({
      id: "headline-long",
      severity: "info",
      message: "Nadpis je dlouhý — v menších formátech může být zmenšen na 2 řádky.",
    });
  }

  if (ctaWords > 3) {
    items.push({
      id: "cta-many-words",
      severity: "warning",
      message: "CTA by mělo mít 1–3 slova, jinak se nemusí vejít do malých bannerů.",
    });
  } else if (ctaLen > 18) {
    items.push({
      id: "cta-long",
      severity: "warning",
      message: "CTA je dlouhé — v úzkých formátech může být zmenšeno nebo oříznuto.",
    });
  }

  if (badgeLen > 8) {
    items.push({
      id: "badge-long",
      severity: "info",
      message: "Text štítku je dlouhý — v malých formátech může být skrytý.",
    });
  }

  if (tinyHorizontal && isClassicBannerSlotVisible(data, "badge") && badgeLen > 0) {
    items.push({
      id: "badge-tiny-format",
      severity: "info",
      message: "Štítek je v tomto úzkém formátu omezený nebo skrytý, aby nepřekrýval text.",
    });
  }

  if (variant && isClassicBannerSlotVisible(data, "slogan") && content.slogan.trim()) {
    const computed = computeClassicBannerLayout({
      width: variant.width,
      height: variant.height,
      family: variant.family,
      content: data.content,
      designTokens: data.designTokens,
      slots: data.slots,
    });
    if (!computed.showSlogan) {
      items.push({
        id: "slogan-hidden-format",
        severity: "info",
        message: "Slogan je v tomto formátu skrytý — prostor je vyhrazen nadpisu a CTA.",
      });
    }
  }

  if (mobileLike && isClassicBannerSlotVisible(data, "slogan") && content.slogan.trim()) {
    items.push({
      id: "slogan-mobile",
      severity: "info",
      message: "Slogan se v mobilních a úzkých formátech obvykle nezobrazuje.",
    });
  }

  if (data.designTokens.logoPositionPreset === "top-right" && mobileLike) {
    items.push({
      id: "logo-position-mobile",
      severity: "info",
      message: "Logo vpravo nahoře může v úzkém formátu zmenšit prostor pro nadpis.",
    });
  }

  if (tinyHorizontal) {
    const visibleSlots = ["logo", "headline", "slogan", "hero", "cta", "badge"].filter((id) =>
      isClassicBannerSlotVisible(data, id as "logo"),
    ).length;
    if (visibleSlots >= 5) {
      items.push({
        id: "too-many-elements-tiny",
        severity: "warning",
        message: "V tomto malém formátu je zapnuto mnoho vrstev — některé budou automaticky skryté.",
      });
    }
  }

  if (isClassicBannerSlotVisible(data, "logo") && !hasClassicBannerImageSource(content, "logo")) {
    items.push({
      id: "logo-missing",
      severity: "warning",
      message: "Chybí logo.",
    });
  }

  if (!hasClassicBannerImageSource(content, "background")) {
    items.push({
      id: "background-missing",
      severity: "warning",
      message: "Chybí URL pozadí.",
    });
  }

  if (isClassicBannerSlotVisible(data, "hero") && !hasClassicBannerImageSource(content, "hero")) {
    items.push({
      id: "hero-missing",
      severity: "warning",
      message: "Chybí hero obrázek.",
    });
  }

  if (!isClassicBannerSlotVisible(data, "hero")) {
    items.push({
      id: "hero-disabled",
      severity: "info",
      message: "Hero obrázek je vypnutý, layout použije textovější variantu.",
    });
  }

  return items;
}
