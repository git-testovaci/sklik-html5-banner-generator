import type {
  ClassicBannerContent,
  ClassicBannerDesignTokens,
  ClassicBannerLayoutFamily,
  ClassicBannerSlot,
  ClassicBannerSlotId,
} from "@/types/classic-banner";

export interface ClassicBannerLayoutRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ClassicBannerLayoutZIndex {
  background: number;
  hero: number;
  headline: number;
  slogan: number;
  logo: number;
  cta: number;
  badge: number;
}

export interface ClassicBannerComputedLayout {
  padding: number;
  logo: ClassicBannerLayoutRect;
  headline: ClassicBannerLayoutRect;
  slogan: ClassicBannerLayoutRect;
  hero: ClassicBannerLayoutRect;
  cta: ClassicBannerLayoutRect;
  badge: ClassicBannerLayoutRect;
  zIndex: ClassicBannerLayoutZIndex;
  headlineFontSize: number;
  sloganFontSize: number;
  ctaFontSize: number;
  badgeFontSize: number;
  logoMaxHeight: number;
  ctaPaddingX: number;
  ctaPaddingY: number;
  headlineMaxLines: number;
  showSlogan: boolean;
  showHero: boolean;
  showBadge: boolean;
}

export interface ClassicBannerLayoutInput {
  width: number;
  height: number;
  family: ClassicBannerLayoutFamily;
  content: ClassicBannerContent;
  designTokens: ClassicBannerDesignTokens;
  slots: ClassicBannerSlot[];
}

type LayoutMaster = "horizontal" | "rectangle" | "square" | "vertical" | "hero";

const Z_INDEX: ClassicBannerLayoutZIndex = {
  background: 0,
  hero: 1,
  headline: 2,
  slogan: 2,
  logo: 3,
  cta: 4,
  badge: 5,
};

const ZERO_RECT: ClassicBannerLayoutRect = { left: 0, top: 0, width: 0, height: 0 };

function slotVisible(slots: ClassicBannerSlot[], id: ClassicBannerSlotId): boolean {
  return slots.find((slot) => slot.id === id)?.visible ?? false;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): ClassicBannerLayoutRect {
  const safeLeft = clamp(left, 0, 100);
  const safeTop = clamp(top, 0, 100);
  const maxW = 100 - safeLeft;
  const maxH = 100 - safeTop;
  return {
    left: safeLeft,
    top: safeTop,
    width: clamp(width, 0, maxW),
    height: clamp(height, 0, maxH),
  };
}

function rectBottom(r: ClassicBannerLayoutRect): number {
  return r.top + r.height;
}

function rectRight(r: ClassicBannerLayoutRect): number {
  return r.left + r.width;
}

function rectsOverlap(
  a: ClassicBannerLayoutRect,
  b: ClassicBannerLayoutRect,
  gap = 0.4,
): boolean {
  if (a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0) return false;
  return !(
    rectRight(a) + gap <= b.left ||
    rectRight(b) + gap <= a.left ||
    rectBottom(a) + gap <= b.top ||
    rectBottom(b) + gap <= a.top
  );
}

function clampRectToSafeArea(
  r: ClassicBannerLayoutRect,
  padX: number,
  padY: number,
): ClassicBannerLayoutRect {
  if (r.width <= 0 || r.height <= 0) return r;
  const left = clamp(r.left, padX, 100 - padX - r.width);
  const top = clamp(r.top, padY, 100 - padY - r.height);
  const maxW = 100 - padX - left;
  const maxH = 100 - padY - top;
  return {
    left,
    top,
    width: clamp(r.width, 0, maxW),
    height: clamp(r.height, 0, maxH),
  };
}

function placeBelow(
  anchor: ClassicBannerLayoutRect,
  target: ClassicBannerLayoutRect,
  gap = 1,
): ClassicBannerLayoutRect {
  if (!rectsOverlap(anchor, target)) return target;
  return rect(target.left, rectBottom(anchor) + gap, target.width, target.height);
}

function placeRightOf(
  anchor: ClassicBannerLayoutRect,
  target: ClassicBannerLayoutRect,
  gap = 1,
): ClassicBannerLayoutRect {
  if (!rectsOverlap(anchor, target)) return target;
  return rect(rectRight(anchor) + gap, target.top, target.width, target.height);
}

function headlineCharCount(headline: string): number {
  return headline.replace(/\s+/g, " ").trim().length;
}

function headlineLineCount(headline: string): number {
  return Math.max(1, headline.split("\n").filter((line) => line.length > 0).length);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function layoutMaster(input: ClassicBannerLayoutInput): LayoutMaster {
  const { width, height, family } = input;

  if (
    family === "interscroller" ||
    (width === 580 && height === 400) ||
    (width >= 970 && height >= 180 && height <= 320) ||
    (width === 930 && height === 180)
  ) {
    return "hero";
  }

  if (family === "mobile" || height <= 120) {
    return "horizontal";
  }

  if (family === "square") {
    return "square";
  }

  if (family === "vertical" || family === "portrait") {
    return "vertical";
  }

  if (height <= 100 && width >= 280) {
    return "horizontal";
  }

  return "rectangle";
}

function safePadding(
  width: number,
  height: number,
  spacingScale: number,
  master: LayoutMaster,
): number {
  const shortSide = Math.min(width, height);

  if (master === "horizontal" || height <= 60) {
    return clamp(8 * spacingScale, 6, 10);
  }
  if (height <= 100) {
    return clamp(10 * spacingScale, 8, 12);
  }
  if (shortSide <= 280) {
    return clamp(16 * spacingScale, 14, 20);
  }
  if (shortSide <= 600) {
    return clamp(22 * spacingScale, 18, 28);
  }
  return clamp(32 * spacingScale, 24, 48);
}

function reserveLogo(input: ClassicBannerLayoutInput): boolean {
  return slotVisible(input.slots, "logo");
}

function reserveHero(input: ClassicBannerLayoutInput, master: LayoutMaster): boolean {
  if (!slotVisible(input.slots, "hero")) return false;
  if (!input.content.heroImageUrl.trim() && !input.content.heroAssetId) return false;
  const { width, height } = input;
  if (master === "horizontal") {
    if (height <= 60) return false;
    if (height <= 100 && width < 600) return false;
    return true;
  }
  if (height <= 50 && width <= 340) return false;
  return true;
}

function reserveBadge(input: ClassicBannerLayoutInput, master: LayoutMaster): boolean {
  if (!slotVisible(input.slots, "badge")) return false;
  if (!input.content.badgeText.trim()) return false;
  const { width, height } = input;
  if (master === "horizontal" && height <= 60) return false;
  if (height <= 50 && width <= 340) return false;
  const badgeWords = wordCount(input.content.badgeText);
  if (master === "horizontal" && badgeWords > 2) return false;
  return true;
}

function shouldShowSlogan(
  input: ClassicBannerLayoutInput,
  master: LayoutMaster,
): boolean {
  const { width, height, content, slots } = input;
  if (!slotVisible(slots, "slogan") || !content.slogan.trim()) return false;

  if (width <= 160 || height <= 60) return false;
  if (master === "horizontal" && height <= 100) return false;
  if (master === "horizontal" && width === 320 && height === 50) return false;
  if (master === "horizontal" && !(height >= 100 || width >= 900)) return false;
  if (master === "square" && width < 300) return false;
  if (master === "vertical" && width <= 160) return false;
  if (headlineCharCount(content.headline) > 48 && height < 280) return false;

  return true;
}

function maxHeadlineLines(master: LayoutMaster, width: number, height: number): number {
  if (master === "horizontal") return 1;
  if (master === "hero") return 2;
  if (master === "rectangle") return 2;
  if (master === "square") return width >= 300 ? 2 : 2;
  if (master === "vertical") {
    if (width <= 160) return 4;
    return 3;
  }
  return clamp(Math.floor(height / 80), 1, 3);
}

function fitHeadlineMetrics(
  width: number,
  height: number,
  master: LayoutMaster,
  headline: string,
  textWidthPx: number,
): { fontSize: number; maxLines: number } {
  const chars = headlineCharCount(headline);
  const explicitLines = headlineLineCount(headline);
  let fontSize = clamp(Math.min(width, height) * 0.085, 9, 44);
  let maxLines = maxHeadlineLines(master, width, height);

  if (master === "horizontal") {
    fontSize = clamp(height * 0.42, 9, 18);
    maxLines = 1;
  } else if (master === "vertical" && width <= 160) {
    fontSize = clamp(width * 0.11, 9, 16);
    maxLines = clamp(Math.max(explicitLines, 3), 2, 4);
  } else if (master === "square") {
    fontSize *= 0.9;
    maxLines = 2;
  } else if (master === "hero") {
    fontSize = clamp(height * 0.09, 14, 36);
    maxLines = 2;
  } else if (master === "rectangle") {
    fontSize = clamp(Math.min(width, height) * 0.075, 11, 28);
    maxLines = 2;
  }

  let approxCharsPerLine = Math.max(6, textWidthPx / (fontSize * 0.52));
  let neededLines = Math.ceil(chars / approxCharsPerLine);
  while (neededLines > maxLines && fontSize > 8) {
    fontSize *= 0.92;
    approxCharsPerLine = Math.max(6, textWidthPx / (fontSize * 0.52));
    neededLines = Math.ceil(chars / approxCharsPerLine);
  }
  maxLines = clamp(Math.max(maxLines, explicitLines), 1, maxLines);

  if (neededLines > 1) {
    fontSize *= clamp(1 - (neededLines - 1) * 0.07, 0.7, 1);
  }
  if (chars > 55) fontSize *= 0.9;
  if (chars > 80) fontSize *= 0.85;

  return {
    fontSize: clamp(fontSize, 8, 42),
    maxLines,
  };
}

function fitSloganMetrics(headlineSize: number, show: boolean): { fontSize: number; show: boolean } {
  if (!show) return { fontSize: 0, show: false };
  return { fontSize: clamp(headlineSize * 0.55, 8, 18), show: true };
}

function fitCtaMetrics(
  width: number,
  height: number,
  master: LayoutMaster,
  ctaText: string,
): { fontSize: number; paddingX: number; paddingY: number } {
  const shortSide = Math.min(width, height);
  let fontSize = clamp(shortSide * 0.065, 9, 20);
  if (master === "horizontal") fontSize = clamp(height * 0.38, 8, 15);
  if (ctaText.length > 14) fontSize *= 0.9;
  if (ctaText.length > 22) fontSize *= 0.85;

  return {
    fontSize: clamp(fontSize, 8, 20),
    paddingX: clamp(shortSide * 0.035, 5, 16),
    paddingY: clamp(shortSide * 0.02, 3, 10),
  };
}

function logoMaxHeightFor(width: number, height: number, master: LayoutMaster): number {
  const shortSide = Math.min(width, height);
  if (master === "horizontal") return clamp(height * 0.62, 12, 40);
  if (master === "square") return clamp(shortSide * 0.14, 18, 52);
  if (master === "vertical") {
    if (width <= 160) return clamp(width * 0.36, 22, 52);
    return clamp(shortSide * 0.16, 24, 58);
  }
  if (master === "hero") return clamp(shortSide * 0.14, 20, 54);
  if (master === "rectangle") return clamp(shortSide * 0.15, 20, 56);
  return clamp(shortSide * 0.14, 16, 52);
}

function logoRect(
  width: number,
  height: number,
  padding: number,
  logoMaxHeight: number,
  preset: ClassicBannerDesignTokens["logoPositionPreset"],
  master: LayoutMaster,
): ClassicBannerLayoutRect {
  const padX = (padding / width) * 100;
  const padY = (padding / height) * 100;

  if (master === "horizontal") {
    const logoW = clamp((logoMaxHeight * 2.1 / width) * 100, 12, 20);
    const logoH = clamp(100 - padY * 2, 55, 88);
    return rect(padX, padY + (100 - padY * 2 - logoH) / 2, logoW, logoH);
  }

  const isNarrowVertical = master === "vertical" && width <= 160;
  const logoW = clamp(
    (logoMaxHeight * (isNarrowVertical ? 3.1 : 2.8) / width) * 100,
    isNarrowVertical ? 28 : 16,
    isNarrowVertical ? 44 : master === "square" ? 38 : 40,
  );
  const logoH = clamp(
    (logoMaxHeight / height) * 100,
    isNarrowVertical ? 7 : 6,
    master === "square" ? 16 : isNarrowVertical ? 11 : 17,
  );

  if (preset === "top-center") {
    return rect(50 - logoW / 2, padY, logoW, logoH);
  }
  if (preset === "top-right") {
    return rect(100 - padX - logoW, padY, logoW, logoH);
  }
  return rect(padX, padY, logoW, logoH);
}

function badgeRectNearHero(
  hero: ClassicBannerLayoutRect,
  padX: number,
  padY: number,
): ClassicBannerLayoutRect {
  const badgeW = 14;
  const badgeH = 9;
  if (hero.width > 0 && hero.height > 0) {
    return rect(
      clamp(rectRight(hero) - badgeW - 1, padX, 100 - padX - badgeW),
      clamp(hero.top + 1, padY, 100 - padY - badgeH),
      badgeW,
      badgeH,
    );
  }
  return rect(100 - padX - badgeW, padY, badgeW, badgeH);
}

function constrainHeadlineForLogoPreset(
  headline: ClassicBannerLayoutRect,
  logo: ClassicBannerLayoutRect,
  preset: ClassicBannerDesignTokens["logoPositionPreset"],
  padX: number,
  master: LayoutMaster,
): ClassicBannerLayoutRect {
  if (logo.width <= 0 || logo.height <= 0) return headline;

  if (preset === "top-center" && master !== "horizontal") {
    return placeBelow(logo, headline, 1);
  }

  if (preset === "top-right" && master !== "horizontal") {
    const maxWidth = logo.left - padX - 1.5;
    if (maxWidth > 12) {
      return rect(headline.left, headline.top, Math.min(headline.width, maxWidth), headline.height);
    }
  }

  return headline;
}

function applyOverlapPrevention(
  layout: Omit<ClassicBannerComputedLayout, "zIndex">,
  padX: number,
  padY: number,
  showLogo: boolean,
  showBadge: boolean,
  master: LayoutMaster,
  logoPreset: ClassicBannerDesignTokens["logoPositionPreset"],
): Omit<ClassicBannerComputedLayout, "zIndex"> {
  let { logo, headline, slogan, hero, cta, badge } = layout;

  if (showLogo && logo.width > 0) {
    headline = constrainHeadlineForLogoPreset(headline, logo, logoPreset, padX, master);
    if (master === "horizontal") {
      headline = placeRightOf(logo, headline, 1.5);
    } else if (logoPreset === "top-left") {
      headline = placeBelow(logo, headline, 1);
    }
  }

  if (cta.width > 0 && headline.width > 0) {
    if (rectsOverlap(headline, cta)) {
      const stackedTop = Math.min(headline.top, cta.top);
      const available = cta.top - stackedTop;
      if (available > headline.height + 1) {
        headline = rect(headline.left, stackedTop, headline.width, headline.height);
      } else {
        headline = placeBelow(logo.width > 0 ? logo : { ...ZERO_RECT, top: padY, height: 0.1 }, headline, 1);
        const maxHeadlineH = Math.max(6, cta.top - headline.top - 1);
        headline = rect(headline.left, headline.top, headline.width, Math.min(headline.height, maxHeadlineH));
      }
    }
  }

  if (showBadge && badge.width > 0) {
    if (hero.width > 0) {
      badge = badgeRectNearHero(hero, padX, padY);
    }
    if (rectsOverlap(badge, headline)) {
      badge = rect(badge.left, rectBottom(headline) + 8, badge.width, badge.height);
    }
    if (rectsOverlap(badge, logo)) {
      badge = rect(logo.left, rectBottom(logo) + 1, badge.width, badge.height);
    }
    if (rectsOverlap(badge, cta)) {
      badge = rect(badge.left, cta.top - badge.height - 1, badge.width, badge.height);
    }
  }

  logo = clampRectToSafeArea(logo, padX, padY);
  headline = clampRectToSafeArea(headline, padX, padY);
  slogan = clampRectToSafeArea(slogan, padX, padY);
  hero = clampRectToSafeArea(hero, padX, padY);
  cta = clampRectToSafeArea(cta, padX, padY);
  badge = clampRectToSafeArea(badge, padX, padY);

  return { ...layout, logo, headline, slogan, hero, cta, badge };
}

function finalizeLayout(
  input: ClassicBannerLayoutInput,
  master: LayoutMaster,
  partial: Omit<ClassicBannerComputedLayout, "zIndex">,
): ClassicBannerComputedLayout {
  const padX = (partial.padding / input.width) * 100;
  const padY = (partial.padding / input.height) * 100;
  const resolved = applyOverlapPrevention(
    partial,
    padX,
    padY,
    reserveLogo(input),
    reserveBadge(input, master),
    master,
    input.designTokens.logoPositionPreset,
  );
  return { ...resolved, zIndex: Z_INDEX };
}

function buildHorizontalMaster(input: ClassicBannerLayoutInput): ClassicBannerComputedLayout {
  const { width, height, content, designTokens } = input;
  const master: LayoutMaster = "horizontal";
  const padding = safePadding(width, height, designTokens.spacingScale, master);
  const padX = (padding / width) * 100;
  const padY = (padding / height) * 100;
  const showLogo = reserveLogo(input);
  const showHero = reserveHero(input, master);
  const showBadge = reserveBadge(input, master);
  const showSlogan = shouldShowSlogan(input, master);
  const logoMaxHeight = logoMaxHeightFor(width, height, master);

  const logo = showLogo
    ? logoRect(width, height, padding, logoMaxHeight, designTokens.logoPositionPreset, master)
    : ZERO_RECT;

  const ctaFit = fitCtaMetrics(width, height, master, content.ctaText);
  const ctaW = clamp((width * 0.22) / width * 100, 18, 30);
  const ctaH = clamp(((ctaFit.fontSize + ctaFit.paddingY * 2) / height) * 100, 55, 88);
  const ctaTop = padY + (100 - padY * 2 - ctaH) / 2;
  const cta = rect(100 - padX - ctaW, ctaTop, ctaW, ctaH);

  const heroW = showHero ? clamp(16, 12, 22) : 0;
  const heroLeft = 100 - padX - ctaW - 1.5 - heroW;
  const hero = showHero ? rect(heroLeft, padY, heroW, 100 - padY * 2) : ZERO_RECT;

  const headlineLeft = showLogo ? rectRight(logo) + 1.5 : padX;
  const headlineRight = showHero ? heroLeft - 1 : 100 - padX - ctaW - 1.5;
  const headlineW = Math.max(headlineRight - headlineLeft, 12);
  const textWidthPx = width * (headlineW / 100);
  const headlineFit = fitHeadlineMetrics(width, height, master, content.headline, textWidthPx);
  const headlineH = clamp(((headlineFit.fontSize * 1.15) / height) * 100, 35, 88);
  const headlineTop = padY + (100 - padY * 2 - headlineH) / 2;
  const headline = rect(headlineLeft, headlineTop, headlineW, headlineH);

  const sloganFit = fitSloganMetrics(headlineFit.fontSize, showSlogan);
  const slogan = sloganFit.show
    ? rect(headlineLeft, rectBottom(headline) + 0.5, headlineW, clamp(((sloganFit.fontSize * 1.2) / height) * 100, 8, 18))
    : ZERO_RECT;

  const badge = showBadge ? badgeRectNearHero(hero, padX, padY) : ZERO_RECT;

  return finalizeLayout(input, master, {
    padding,
    logo,
    headline,
    slogan,
    hero,
    cta,
    badge,
    headlineFontSize: headlineFit.fontSize,
    sloganFontSize: sloganFit.fontSize,
    ctaFontSize: ctaFit.fontSize,
    badgeFontSize: clamp(height * 0.32, 8, 13),
    logoMaxHeight,
    ctaPaddingX: ctaFit.paddingX,
    ctaPaddingY: ctaFit.paddingY,
    headlineMaxLines: headlineFit.maxLines,
    showSlogan: sloganFit.show,
    showHero,
    showBadge,
  });
}

function buildRectangleMaster(input: ClassicBannerLayoutInput): ClassicBannerComputedLayout {
  const { width, height, content, designTokens } = input;
  const master: LayoutMaster = "rectangle";
  const padding = safePadding(width, height, designTokens.spacingScale, master);
  const padX = (padding / width) * 100;
  const padY = (padding / height) * 100;
  const showLogo = reserveLogo(input);
  const showHero = reserveHero(input, master);
  const showBadge = reserveBadge(input, master);
  const showSlogan = shouldShowSlogan(input, master);
  const logoMaxHeight = logoMaxHeightFor(width, height, master);

  const heroColLeft = 52;
  const textWidth = heroColLeft - padX - 1.5;

  const logo = showLogo
    ? logoRect(width, height, padding, logoMaxHeight, designTokens.logoPositionPreset, master)
    : ZERO_RECT;

  const textWidthPx = width * (textWidth / 100);
  const headlineFit = fitHeadlineMetrics(width, height, master, content.headline, textWidthPx);
  const sloganFit = fitSloganMetrics(headlineFit.fontSize, showSlogan);
  const ctaFit = fitCtaMetrics(width, height, master, content.ctaText);

  const headlineTop = showLogo ? rectBottom(logo) + 1.5 : padY;
  const headlineH = clamp(
    ((headlineFit.fontSize * 1.15 * headlineFit.maxLines) / height) * 100,
    12,
    28,
  );
  const headline = rect(padX, headlineTop, textWidth, headlineH);

  const sloganH = sloganFit.show
    ? clamp(((sloganFit.fontSize * 1.2) / height) * 100, 6, 12)
    : 0;
  const slogan = sloganFit.show
    ? rect(padX, rectBottom(headline) + 0.8, textWidth, sloganH)
    : ZERO_RECT;

  const ctaH = clamp(((ctaFit.fontSize + ctaFit.paddingY * 2) / height) * 100, 10, 16);
  const ctaTop = 100 - padY - ctaH;
  const cta = rect(padX, ctaTop, textWidth - padX * 0.5, ctaH);

  const heroTop = padY;
  const heroH = 100 - padY * 2;
  const hero = showHero ? rect(heroColLeft, heroTop, 100 - padX - heroColLeft, heroH) : ZERO_RECT;

  const badge = showBadge ? badgeRectNearHero(hero, padX, padY) : ZERO_RECT;

  return finalizeLayout(input, master, {
    padding,
    logo,
    headline,
    slogan,
    hero,
    cta,
    badge,
    headlineFontSize: headlineFit.fontSize,
    sloganFontSize: sloganFit.fontSize,
    ctaFontSize: ctaFit.fontSize,
    badgeFontSize: clamp(Math.min(width, height) * 0.045, 8, 15),
    logoMaxHeight,
    ctaPaddingX: ctaFit.paddingX,
    ctaPaddingY: ctaFit.paddingY,
    headlineMaxLines: headlineFit.maxLines,
    showSlogan: sloganFit.show,
    showHero,
    showBadge,
  });
}

function buildSquareMaster(input: ClassicBannerLayoutInput): ClassicBannerComputedLayout {
  const { width, height, content, designTokens } = input;
  const master: LayoutMaster = "square";
  const padding = safePadding(width, height, designTokens.spacingScale, master);
  const padX = (padding / width) * 100;
  const padY = (padding / height) * 100;
  const showLogo = reserveLogo(input);
  const showHero = reserveHero(input, master);
  const showBadge = reserveBadge(input, master);
  const showSlogan = shouldShowSlogan(input, master);
  const logoMaxHeight = logoMaxHeightFor(width, height, master);

  const logo = showLogo
    ? logoRect(width, height, padding, logoMaxHeight, designTokens.logoPositionPreset, master)
    : ZERO_RECT;

  const textWidthPx = width * ((100 - padX * 2) / 100);
  const headlineFit = fitHeadlineMetrics(width, height, master, content.headline, textWidthPx);
  const sloganFit = fitSloganMetrics(headlineFit.fontSize, showSlogan);
  const ctaFit = fitCtaMetrics(width, height, master, content.ctaText);

  const headlineTop = showLogo ? rectBottom(logo) + 1.5 : padY + 2;
  const headlineH = clamp(((headlineFit.fontSize * 1.15 * headlineFit.maxLines) / height) * 100, 10, 22);
  const headline = rect(padX, headlineTop, 100 - padX * 2, headlineH);

  const slogan = sloganFit.show
    ? rect(padX, rectBottom(headline) + 0.8, 100 - padX * 2, clamp(((sloganFit.fontSize * 1.2) / height) * 100, 5, 10))
    : ZERO_RECT;

  const ctaH = clamp(((ctaFit.fontSize + ctaFit.paddingY * 2) / height) * 100, 10, 14);
  const cta = rect(padX, 100 - padY - ctaH, 100 - padX * 2, ctaH);

  const heroTop = Math.max(rectBottom(sloganFit.show ? slogan : headline) + 2, height >= 300 ? 38 : 34);
  const heroBottom = 100 - padY - ctaH - 2;
  const heroH = Math.max(heroBottom - heroTop, showHero ? 18 : 0);
  const hero = showHero
    ? rect(padX + 8, (heroTop / 100) * 100, 100 - padX * 2 - 16, heroH)
    : ZERO_RECT;

  const badge = showBadge ? badgeRectNearHero(hero, padX, padY) : ZERO_RECT;

  return finalizeLayout(input, master, {
    padding,
    logo,
    headline,
    slogan,
    hero,
    cta,
    badge,
    headlineFontSize: headlineFit.fontSize,
    sloganFontSize: sloganFit.fontSize,
    ctaFontSize: ctaFit.fontSize,
    badgeFontSize: clamp(Math.min(width, height) * 0.05, 8, 14),
    logoMaxHeight,
    ctaPaddingX: ctaFit.paddingX,
    ctaPaddingY: ctaFit.paddingY,
    headlineMaxLines: headlineFit.maxLines,
    showSlogan: sloganFit.show,
    showHero,
    showBadge,
  });
}

function buildVerticalMaster(input: ClassicBannerLayoutInput): ClassicBannerComputedLayout {
  const { width, height, content, designTokens } = input;
  const master: LayoutMaster = "vertical";
  const padding = safePadding(width, height, designTokens.spacingScale, master);
  const padX = (padding / width) * 100;
  const padY = (padding / height) * 100;
  const showLogo = reserveLogo(input);
  const showHero = reserveHero(input, master);
  const showBadge = reserveBadge(input, master);
  const showSlogan = shouldShowSlogan(input, master);
  const logoMaxHeight = logoMaxHeightFor(width, height, master);

  const logo = showLogo
    ? logoRect(width, height, padding, logoMaxHeight, designTokens.logoPositionPreset, master)
    : ZERO_RECT;

  const textWidthPx = width * ((100 - padX * 2) / 100);
  const headlineFit = fitHeadlineMetrics(width, height, master, content.headline, textWidthPx);
  const sloganFit = fitSloganMetrics(headlineFit.fontSize, showSlogan);
  const ctaFit = fitCtaMetrics(width, height, master, content.ctaText);

  const headlineTop = showLogo ? rectBottom(logo) + 1.5 : padY;
  const headlineH = clamp(
    ((headlineFit.fontSize * 1.2 * headlineFit.maxLines) / height) * 100,
    width <= 160 ? 12 : 10,
    width <= 160 ? 28 : 20,
  );
  const headline = rect(padX, headlineTop, 100 - padX * 2, headlineH);

  const sloganH = sloganFit.show
    ? clamp(((sloganFit.fontSize * 1.2) / height) * 100, 4, 8)
    : 0;
  const slogan = sloganFit.show
    ? rect(padX, rectBottom(headline) + 0.8, 100 - padX * 2, sloganH)
    : ZERO_RECT;

  const ctaH = clamp(((ctaFit.fontSize + ctaFit.paddingY * 2) / height) * 100, 6, 12);
  const ctaTop = 100 - padY - ctaH;
  const cta = rect(padX, ctaTop, 100 - padX * 2, ctaH);

  const textEnd = sloganFit.show ? rectBottom(slogan) : rectBottom(headline);
  const heroTop = textEnd + 2;
  const heroH = Math.max(ctaTop - heroTop - 2, showHero ? 14 : 0);
  const hero = showHero ? rect(padX, heroTop, 100 - padX * 2, heroH) : ZERO_RECT;

  const badge = showBadge ? badgeRectNearHero(hero, padX, padY) : ZERO_RECT;

  return finalizeLayout(input, master, {
    padding,
    logo,
    headline,
    slogan,
    hero,
    cta,
    badge,
    headlineFontSize: headlineFit.fontSize,
    sloganFontSize: sloganFit.fontSize,
    ctaFontSize: ctaFit.fontSize,
    badgeFontSize: clamp(Math.min(width, height) * 0.05, 8, 16),
    logoMaxHeight,
    ctaPaddingX: ctaFit.paddingX,
    ctaPaddingY: ctaFit.paddingY,
    headlineMaxLines: headlineFit.maxLines,
    showSlogan: sloganFit.show,
    showHero,
    showBadge,
  });
}

function buildHeroMaster(input: ClassicBannerLayoutInput): ClassicBannerComputedLayout {
  const { width, height, content, designTokens } = input;
  const master: LayoutMaster = "hero";
  const padding = safePadding(width, height, designTokens.spacingScale, master);
  const padX = (padding / width) * 100;
  const padY = (padding / height) * 100;
  const showLogo = reserveLogo(input);
  const showHero = reserveHero(input, master);
  const showBadge = reserveBadge(input, master);
  const showSlogan = shouldShowSlogan(input, master);
  const logoMaxHeight = logoMaxHeightFor(width, height, master);

  const heroColLeft = 48;
  const textWidth = heroColLeft - padX - 1.5;

  const logo = showLogo
    ? logoRect(width, height, padding, logoMaxHeight, designTokens.logoPositionPreset, master)
    : ZERO_RECT;

  const textWidthPx = width * (textWidth / 100);
  const headlineFit = fitHeadlineMetrics(width, height, master, content.headline, textWidthPx);
  const sloganFit = fitSloganMetrics(headlineFit.fontSize, showSlogan);
  const ctaFit = fitCtaMetrics(width, height, master, content.ctaText);

  const headlineTop = showLogo ? rectBottom(logo) + 1.5 : padY;
  const headlineH = clamp(
    ((headlineFit.fontSize * 1.15 * headlineFit.maxLines) / height) * 100,
    14,
    32,
  );
  const headline = rect(padX, headlineTop, textWidth, headlineH);

  const slogan = sloganFit.show
    ? rect(padX, rectBottom(headline) + 0.8, textWidth, clamp(((sloganFit.fontSize * 1.2) / height) * 100, 6, 12))
    : ZERO_RECT;

  const ctaH = clamp(((ctaFit.fontSize + ctaFit.paddingY * 2) / height) * 100, 10, 16);
  const ctaTop = sloganFit.show
    ? rectBottom(slogan) + 2
    : rectBottom(headline) + 2;
  const cta = rect(padX, Math.min(ctaTop, 100 - padY - ctaH), textWidth - padX * 0.5, ctaH);

  const hero = showHero
    ? rect(heroColLeft, padY, 100 - padX - heroColLeft, 100 - padY * 2)
    : ZERO_RECT;

  const badge = showBadge ? badgeRectNearHero(hero, padX, padY) : ZERO_RECT;

  return finalizeLayout(input, master, {
    padding,
    logo,
    headline,
    slogan,
    hero,
    cta,
    badge,
    headlineFontSize: headlineFit.fontSize,
    sloganFontSize: sloganFit.fontSize,
    ctaFontSize: ctaFit.fontSize,
    badgeFontSize: clamp(Math.min(width, height) * 0.045, 9, 16),
    logoMaxHeight,
    ctaPaddingX: ctaFit.paddingX,
    ctaPaddingY: ctaFit.paddingY,
    headlineMaxLines: headlineFit.maxLines,
    showSlogan: sloganFit.show,
    showHero,
    showBadge,
  });
}

/** Single source of truth for classic banner automatic layout. */
export function computeClassicBannerLayout(
  input: ClassicBannerLayoutInput,
): ClassicBannerComputedLayout {
  const master = layoutMaster(input);

  switch (master) {
    case "horizontal":
      return buildHorizontalMaster(input);
    case "square":
      return buildSquareMaster(input);
    case "vertical":
      return buildVerticalMaster(input);
    case "hero":
      return buildHeroMaster(input);
    case "rectangle":
    default:
      return buildRectangleMaster(input);
  }
}
