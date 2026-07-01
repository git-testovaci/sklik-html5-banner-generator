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
}

export interface ClassicBannerLayoutInput {
  width: number;
  height: number;
  family: ClassicBannerLayoutFamily;
  content: ClassicBannerContent;
  designTokens: ClassicBannerDesignTokens;
  slots: ClassicBannerSlot[];
}

const Z_INDEX: ClassicBannerLayoutZIndex = {
  background: 0,
  hero: 1,
  headline: 2,
  slogan: 2,
  logo: 3,
  cta: 4,
  badge: 5,
};

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
  return {
    left: clamp(left, 0, 100),
    top: clamp(top, 0, 100),
    width: clamp(width, 0, 100 - clamp(left, 0, 100)),
    height: clamp(height, 0, 100 - clamp(top, 0, 100)),
  };
}

function rectBottom(r: ClassicBannerLayoutRect): number {
  return r.top + r.height;
}

function rectRight(r: ClassicBannerLayoutRect): number {
  return r.left + r.width;
}

function hasLogoSlot(input: ClassicBannerLayoutInput): boolean {
  return slotVisible(input.slots, "logo");
}

function hasHeroSlot(input: ClassicBannerLayoutInput): boolean {
  return slotVisible(input.slots, "hero");
}

function hasLogoContent(input: ClassicBannerLayoutInput): boolean {
  return hasLogoSlot(input) && Boolean(input.content.logoUrl.trim());
}

function hasHeroContent(input: ClassicBannerLayoutInput): boolean {
  return hasHeroSlot(input) && Boolean(input.content.heroImageUrl.trim());
}

function hasBadgeSlot(input: ClassicBannerLayoutInput): boolean {
  return slotVisible(input.slots, "badge") && Boolean(input.content.badgeText.trim());
}

function headlineLineCount(headline: string): number {
  return Math.max(1, headline.split("\n").filter((line) => line.length > 0).length);
}

function headlineCharCount(headline: string): number {
  return headline.replace(/\s+/g, " ").trim().length;
}

function aspectRatio(width: number, height: number): number {
  return width / Math.max(height, 1);
}

function safePadding(width: number, height: number, spacingScale: number, family: ClassicBannerLayoutFamily): number {
  const shortSide = Math.min(width, height);
  const ratio = aspectRatio(width, height);
  let factor = 0.04;

  if (family === "mobile" || height <= 100) factor = 0.03;
  if (ratio > 5) factor = 0.025;
  if (family === "interscroller" || family === "portrait") factor = 0.045;

  return clamp(shortSide * factor * spacingScale, 3, 28);
}

function fitHeadlineMetrics(
  width: number,
  height: number,
  family: ClassicBannerLayoutFamily,
  headline: string,
  textWidthPx: number,
): { fontSize: number; maxLines: number } {
  const chars = headlineCharCount(headline);
  const explicitLines = headlineLineCount(headline);
  const ratio = aspectRatio(width, height);
  const isTiny = height <= 90 || width <= 160;
  const isMobile = family === "mobile" || (height <= 100 && ratio >= 3);

  let fontSize = clamp(Math.min(width, height) * 0.085, 9, 44);
  let maxLines = Math.max(explicitLines, chars > 36 ? 2 : 1);

  if (isMobile) {
    fontSize *= 0.72;
    maxLines = Math.max(maxLines, chars > 22 ? 2 : 1);
  }
  if (isTiny) {
    fontSize *= 0.68;
    maxLines = Math.min(Math.max(maxLines, 2), 2);
  }
  if (ratio > 4.5) {
    fontSize *= 0.75;
  }
  if (family === "square") {
    fontSize *= 0.9;
  }

  const approxCharsPerLine = Math.max(6, textWidthPx / (fontSize * 0.52));
  const neededLines = Math.ceil(chars / approxCharsPerLine);
  maxLines = clamp(Math.max(maxLines, neededLines), 1, 3);

  if (neededLines > 1) {
    fontSize *= clamp(1 - (neededLines - 1) * 0.08, 0.72, 1);
  }
  if (chars > 55) fontSize *= 0.88;
  if (chars > 80) fontSize *= 0.85;

  return {
    fontSize: clamp(fontSize, 8, 42),
    maxLines,
  };
}

function fitSloganMetrics(
  headlineSize: number,
  family: ClassicBannerLayoutFamily,
  width: number,
  height: number,
): { fontSize: number; show: boolean } {
  const isTiny = height <= 90 || width <= 200;
  const isMobile = family === "mobile" || height <= 100;

  if (isTiny || isMobile) {
    return { fontSize: clamp(headlineSize * 0.5, 7, 14), show: height > 70 };
  }
  return { fontSize: clamp(headlineSize * 0.55, 8, 20), show: true };
}

function fitCtaMetrics(
  width: number,
  height: number,
  family: ClassicBannerLayoutFamily,
  ctaText: string,
): { fontSize: number; paddingX: number; paddingY: number } {
  const shortSide = Math.min(width, height);
  let fontSize = clamp(shortSide * 0.065, 9, 20);
  if (family === "mobile" || height <= 100) fontSize = clamp(shortSide * 0.075, 8, 16);
  if (ctaText.length > 14) fontSize *= 0.9;
  if (ctaText.length > 22) fontSize *= 0.85;

  return {
    fontSize: clamp(fontSize, 8, 20),
    paddingX: clamp(shortSide * 0.035, 5, 16),
    paddingY: clamp(shortSide * 0.02, 3, 10),
  };
}

function logoRect(
  width: number,
  height: number,
  padding: number,
  logoMaxHeight: number,
  preset: ClassicBannerDesignTokens["logoPositionPreset"],
): ClassicBannerLayoutRect {
  const padX = (padding / width) * 100;
  const padY = (padding / height) * 100;
  const logoW = clamp((logoMaxHeight * 2.4 / width) * 100, 10, 38);
  const logoH = clamp((logoMaxHeight / height) * 100, 5, 16);

  if (preset === "top-center") {
    return rect(50 - logoW / 2, padY, logoW, logoH);
  }
  if (preset === "top-right") {
    return rect(100 - padX - logoW, padY, logoW, logoH);
  }
  return rect(padX, padY, logoW, logoH);
}

function headlineStartBelowLogo(
  logo: ClassicBannerLayoutRect,
  hasLogo: boolean,
  padY: number,
  preset: ClassicBannerDesignTokens["logoPositionPreset"],
  family: ClassicBannerLayoutFamily,
): number {
  if (!hasLogo) return padY;
  const logoBottom = rectBottom(logo);
  if (preset === "top-center" || family === "vertical" || family === "portrait" || family === "interscroller") {
    return logoBottom + 1.5;
  }
  if (preset === "top-left") {
    return padY;
  }
  return logoBottom + 1;
}

function placeBadgeRect(
  hero: ClassicBannerLayoutRect,
  cta: ClassicBannerLayoutRect,
  logo: ClassicBannerLayoutRect,
  padX: number,
  padY: number,
  hasHero: boolean,
): ClassicBannerLayoutRect {
  const badgeW = 14;
  const badgeH = 10;

  if (hasHero && hero.width > 0 && hero.height > 0) {
    return rect(rectRight(hero) - badgeW - 1, hero.top + 1, badgeW, badgeH);
  }

  const candidateTop = padY + 1;
  const candidateLeft = 100 - padX - badgeW;
  const overlapsCta =
    candidateTop + badgeH > cta.top - 1 &&
    candidateLeft < rectRight(cta) &&
    candidateLeft + badgeW > cta.left;

  if (overlapsCta) {
    return rect(logo.left, rectBottom(logo) + 1, badgeW, badgeH);
  }
  return rect(candidateLeft, candidateTop, badgeW, badgeH);
}

function buildVerticalLikeLayout(
  input: ClassicBannerLayoutInput,
  stretchHero: boolean,
): ClassicBannerComputedLayout {
  const { width, height, family, content, designTokens, slots } = input;
  const padding = safePadding(width, height, designTokens.spacingScale, family);
  const padX = (padding / width) * 100;
  const padY = (padding / height) * 100;
  const hasLogo = hasLogoContent(input);
  const hasHero = hasHeroContent(input);
  const hasBadge = hasBadgeSlot(input);
  const logoMaxHeight = clamp(Math.min(width, height) * 0.13, 14, 56);

  const logo = hasLogoSlot(input)
    ? logoRect(width, height, padding, logoMaxHeight, designTokens.logoPositionPreset)
    : rect(0, 0, 0, 0);

  const textTop = headlineStartBelowLogo(
    logo,
    hasLogo,
    padY,
    designTokens.logoPositionPreset,
    family,
  );

  const textWidthPx = width * ((100 - padX * 2) / 100);
  const headlineFit = fitHeadlineMetrics(width, height, family, content.headline, textWidthPx);
  const sloganFit = fitSloganMetrics(headlineFit.fontSize, family, width, height);
  const ctaFit = fitCtaMetrics(width, height, family, content.ctaText);

  const headlineLineHeight = 1.15;
  const headlineBlockH =
    ((headlineFit.fontSize * headlineLineHeight * headlineFit.maxLines) / height) * 100;
  const sloganBlockH = sloganFit.show
    ? ((sloganFit.fontSize * 1.2) / height) * 100
    : 0;

  const ctaBlockH = clamp(
    ((ctaFit.fontSize + ctaFit.paddingY * 2) / height) * 100,
    8,
    family === "mobile" ? 18 : 14,
  );
  const ctaTop = 100 - padY - ctaBlockH;

  const textEnd = textTop + headlineBlockH + (sloganFit.show ? sloganBlockH + 1 : 0);
  const heroTop = textEnd + 1.5;
  const heroMaxH = hasHero ? Math.max(ctaTop - heroTop - 2, 12) : 0;
  const heroH = hasHero
    ? clamp(stretchHero ? heroMaxH + 8 : heroMaxH, hasHero ? 14 : 0, 52)
    : 0;

  const headline = rect(padX, textTop, 100 - padX * 2, headlineBlockH);
  const slogan = sloganFit.show
    ? rect(padX, textTop + headlineBlockH + 0.5, 100 - padX * 2, sloganBlockH)
    : rect(0, 0, 0, 0);
  const hero = hasHero ? rect(padX, heroTop, 100 - padX * 2, heroH) : rect(0, 0, 0, 0);
  const cta = rect(padX, ctaTop, 100 - padX * 2, ctaBlockH);
  const badge = hasBadge ? placeBadgeRect(hero, cta, logo, padX, padY, hasHero) : rect(0, 0, 0, 0);

  if (!hasHero) {
    const expandedHeadline = rect(
      padX,
      textTop,
      100 - padX * 2,
      Math.min(ctaTop - textTop - 2, headlineBlockH + 8),
    );
    return {
      padding,
      logo,
      headline: expandedHeadline,
      slogan,
      hero,
      cta,
      badge,
      zIndex: Z_INDEX,
      headlineFontSize: headlineFit.fontSize,
      sloganFontSize: sloganFit.fontSize,
      ctaFontSize: ctaFit.fontSize,
      badgeFontSize: clamp(Math.min(width, height) * 0.05, 8, 16),
      logoMaxHeight,
      ctaPaddingX: ctaFit.paddingX,
      ctaPaddingY: ctaFit.paddingY,
      headlineMaxLines: headlineFit.maxLines,
      showSlogan: sloganFit.show && slotVisible(slots, "slogan"),
    };
  }

  return {
    padding,
    logo,
    headline,
    slogan,
    hero,
    cta,
    badge,
    zIndex: Z_INDEX,
    headlineFontSize: headlineFit.fontSize,
    sloganFontSize: sloganFit.fontSize,
    ctaFontSize: ctaFit.fontSize,
    badgeFontSize: clamp(Math.min(width, height) * 0.05, 8, 16),
    logoMaxHeight,
    ctaPaddingX: ctaFit.paddingX,
    ctaPaddingY: ctaFit.paddingY,
    headlineMaxLines: headlineFit.maxLines,
    showSlogan: sloganFit.show && slotVisible(slots, "slogan"),
  };
}

function buildLandscapeLayout(input: ClassicBannerLayoutInput): ClassicBannerComputedLayout {
  const { width, height, family, content, designTokens, slots } = input;
  const isMobile = family === "mobile";
  const padding = safePadding(width, height, designTokens.spacingScale, family);
  const padX = (padding / width) * 100;
  const padY = (padding / height) * 100;
  const hasLogo = hasLogoContent(input);
  const hasHero = hasHeroContent(input);
  const hasBadge = hasBadgeSlot(input);
  const logoMaxHeight = clamp(height * (isMobile ? 0.55 : 0.42), 12, 48);

  const logo = hasLogoSlot(input)
    ? logoRect(width, height, padding, logoMaxHeight, designTokens.logoPositionPreset)
    : rect(0, 0, 0, 0);

  const heroW = hasHero ? (isMobile ? 26 : 32) : 0;
  const textW = 100 - padX * 2 - heroW - (hasHero ? 2 : 0);
  const textWidthPx = width * (textW / 100);
  const logoOffset = hasLogo ? rectBottom(logo) + 1 : padY;

  const headlineFit = fitHeadlineMetrics(width, height, family, content.headline, textWidthPx);
  const sloganFit = fitSloganMetrics(headlineFit.fontSize, family, width, height);
  const ctaFit = fitCtaMetrics(width, height, family, content.ctaText);

  const headlineBlockH = clamp(
    ((headlineFit.fontSize * 1.15 * Math.min(headlineFit.maxLines, 2)) / height) * 100,
    12,
    isMobile ? 55 : 45,
  );
  const sloganBlockH = sloganFit.show
    ? clamp(((sloganFit.fontSize * 1.2) / height) * 100, 8, 22)
    : 0;
  const ctaBlockH = clamp(
    ((ctaFit.fontSize + ctaFit.paddingY * 2) / height) * 100,
    10,
    24,
  );

  const textTop = isMobile && hasLogo && designTokens.logoPositionPreset !== "top-center"
    ? padY
    : Math.max(padY, logoOffset);

  const ctaTop = 100 - padY - ctaBlockH;
  const ctaW = clamp(isMobile ? 34 : 30, 18, textW);

  const headline = rect(padX, textTop, textW, headlineBlockH);
  const slogan = sloganFit.show
    ? rect(padX, textTop + headlineBlockH, textW, sloganBlockH)
    : rect(0, 0, 0, 0);
  const hero = hasHero
    ? rect(100 - padX - heroW, padY, heroW, 100 - padY * 2)
    : rect(0, 0, 0, 0);

  const cta = rect(padX, ctaTop, ctaW, ctaBlockH);
  const badge = hasBadge ? placeBadgeRect(hero, cta, logo, padX, padY, hasHero) : rect(0, 0, 0, 0);

  if (!hasHero) {
    return {
      padding,
      logo,
      headline: rect(padX, textTop, textW, Math.min(ctaTop - textTop - 2, headlineBlockH + 10)),
      slogan,
      hero,
      cta,
      badge,
      zIndex: Z_INDEX,
      headlineFontSize: headlineFit.fontSize,
      sloganFontSize: sloganFit.fontSize,
      ctaFontSize: ctaFit.fontSize,
      badgeFontSize: clamp(height * 0.35, 8, 14),
      logoMaxHeight,
      ctaPaddingX: ctaFit.paddingX,
      ctaPaddingY: ctaFit.paddingY,
      headlineMaxLines: headlineFit.maxLines,
      showSlogan: sloganFit.show && slotVisible(slots, "slogan"),
    };
  }

  return {
    padding,
    logo,
    headline,
    slogan,
    hero,
    cta,
    badge,
    zIndex: Z_INDEX,
    headlineFontSize: headlineFit.fontSize,
    sloganFontSize: sloganFit.fontSize,
    ctaFontSize: ctaFit.fontSize,
    badgeFontSize: clamp(height * 0.35, 8, 14),
    logoMaxHeight,
    ctaPaddingX: ctaFit.paddingX,
    ctaPaddingY: ctaFit.paddingY,
    headlineMaxLines: headlineFit.maxLines,
    showSlogan: sloganFit.show && slotVisible(slots, "slogan"),
  };
}

function buildSquareLayout(input: ClassicBannerLayoutInput): ClassicBannerComputedLayout {
  const base = buildVerticalLikeLayout(input, false);
  return {
    ...base,
    headlineFontSize: base.headlineFontSize * 0.92,
    hero: hasHeroContent(input)
      ? rect(base.hero.left, base.hero.top, base.hero.width, Math.min(base.hero.height, 30))
      : base.hero,
  };
}

/** Single source of truth for classic banner preview layout. */
export function computeClassicBannerLayout(
  input: ClassicBannerLayoutInput,
): ClassicBannerComputedLayout {
  switch (input.family) {
    case "vertical":
      return buildVerticalLikeLayout(input, false);
    case "portrait":
      return buildVerticalLikeLayout(input, true);
    case "interscroller":
      return buildVerticalLikeLayout(input, true);
    case "square":
      return buildSquareLayout(input);
    case "landscape":
    case "mobile":
      return buildLandscapeLayout(input);
    default:
      return buildVerticalLikeLayout(input, false);
  }
}
