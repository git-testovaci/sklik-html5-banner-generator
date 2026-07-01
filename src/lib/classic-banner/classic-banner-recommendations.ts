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

export function getClassicBannerRecommendations(
  data: ClassicBannerProjectData,
  variant?: ClassicBannerSizeVariant,
): ClassicBannerRecommendation[] {
  const items: ClassicBannerRecommendation[] = [];
  const { content } = data;
  const headlineLen = content.headline.replace(/\s+/g, " ").trim().length;
  const ctaLen = content.ctaText.trim().length;
  const badgeLen = content.badgeText.trim().length;
  const mobileLike = isMobileLikeVariant(variant);

  if (mobileLike && headlineLen > 42) {
    items.push({
      id: "headline-mobile-long",
      severity: "warning",
      message: "Nadpis je pro mobilní formáty dlouhý. Zvažte kratší variantu.",
    });
  } else if (headlineLen > 72) {
    items.push({
      id: "headline-long",
      severity: "info",
      message: "Nadpis je dlouhý — v menších formátech může být zmenšen na 2 řádky.",
    });
  }

  if (ctaLen > 18) {
    items.push({
      id: "cta-long",
      severity: "warning",
      message: "CTA je dlouhé, může se nevejít do malých bannerů.",
    });
  }

  if (badgeLen > 8) {
    items.push({
      id: "badge-long",
      severity: "info",
      message: "Text štítku je dlouhý — zvažte kratší variantu.",
    });
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
