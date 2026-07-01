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

export interface ClassicBannerComputedLayout {
  padding: number;
  logo: ClassicBannerLayoutRect;
  headline: ClassicBannerLayoutRect;
  slogan: ClassicBannerLayoutRect;
  hero: ClassicBannerLayoutRect;
  cta: ClassicBannerLayoutRect;
  badge: ClassicBannerLayoutRect;
  headlineFontSize: number;
  sloganFontSize: number;
  ctaFontSize: number;
  badgeFontSize: number;
  logoMaxHeight: number;
  ctaPaddingX: number;
  ctaPaddingY: number;
}

export interface ClassicBannerLayoutInput {
  width: number;
  height: number;
  family: ClassicBannerLayoutFamily;
  content: ClassicBannerContent;
  designTokens: ClassicBannerDesignTokens;
  slots: ClassicBannerSlot[];
}

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
    width: clamp(width, 0, 100 - left),
    height: clamp(height, 0, 100 - top),
  };
}

function baseMetrics(width: number, height: number, spacingScale: number) {
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  const padding = clamp(shortSide * 0.04 * spacingScale, 4, 24);
  const headlineFontSize = clamp(shortSide * 0.09, 10, 42);
  const sloganFontSize = clamp(headlineFontSize * 0.55, 8, 24);
  const ctaFontSize = clamp(shortSide * 0.065, 9, 20);
  const badgeFontSize = clamp(shortSide * 0.055, 8, 18);
  const logoMaxHeight = clamp(shortSide * 0.14, 16, 56);
  const ctaPaddingX = clamp(shortSide * 0.04, 6, 18);
  const ctaPaddingY = clamp(shortSide * 0.025, 4, 12);

  return {
    padding,
    shortSide,
    longSide,
    headlineFontSize,
    sloganFontSize,
    ctaFontSize,
    badgeFontSize,
    logoMaxHeight,
    ctaPaddingX,
    ctaPaddingY,
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
  const logoW = clamp((logoMaxHeight * 2.5 / width) * 100, 12, 40);
  const logoH = clamp((logoMaxHeight / height) * 100, 6, 18);

  if (preset === "top-center") {
    return rect(50 - logoW / 2, padY, logoW, logoH);
  }
  if (preset === "top-right") {
    return rect(100 - padX - logoW, padY, logoW, logoH);
  }
  return rect(padX, padY, logoW, logoH);
}

function verticalLayout(input: ClassicBannerLayoutInput): ClassicBannerComputedLayout {
  const { width, height, designTokens, slots } = input;
  const m = baseMetrics(width, height, designTokens.spacingScale);
  const padX = (m.padding / width) * 100;
  const padY = (m.padding / height) * 100;
  const hasLogo = slotVisible(slots, "logo");
  const hasHero = slotVisible(slots, "hero");
  const hasBadge = slotVisible(slots, "badge");
  const logoTop = hasLogo ? padY + (m.logoMaxHeight / height) * 100 + 1 : padY;

  const textH = 22;
  const heroH = hasHero ? clamp(38 - (hasLogo ? 4 : 0), 22, 45) : 0;
  const ctaH = clamp((m.ctaFontSize + m.ctaPaddingY * 2) / height * 100, 8, 14);

  const contentTop = logoTop + 1;
  const heroTop = contentTop + textH + 2;
  const ctaTop = 100 - padY - ctaH;

  return {
    padding: m.padding,
    logo: logoRect(width, height, m.padding, m.logoMaxHeight, designTokens.logoPositionPreset),
    headline: rect(padX, contentTop, 100 - padX * 2, textH * 0.55),
    slogan: rect(padX, contentTop + textH * 0.5, 100 - padX * 2, textH * 0.45),
    hero: hasHero
      ? rect(padX, heroTop, 100 - padX * 2, Math.min(heroH, ctaTop - heroTop - 2))
      : rect(padX, heroTop, 0, 0),
    cta: rect(padX, ctaTop, 100 - padX * 2, ctaH),
    badge: hasBadge
      ? rect(100 - padX - 18, heroTop + 2, 16, 10)
      : rect(0, 0, 0, 0),
    headlineFontSize: m.headlineFontSize,
    sloganFontSize: m.sloganFontSize,
    ctaFontSize: m.ctaFontSize,
    badgeFontSize: m.badgeFontSize,
    logoMaxHeight: m.logoMaxHeight,
    ctaPaddingX: m.ctaPaddingX,
    ctaPaddingY: m.ctaPaddingY,
  };
}

function landscapeLayout(input: ClassicBannerLayoutInput): ClassicBannerComputedLayout {
  const { width, height, designTokens, slots } = input;
  const m = baseMetrics(width, height, designTokens.spacingScale);
  const padX = (m.padding / width) * 100;
  const padY = (m.padding / height) * 100;
  const hasLogo = slotVisible(slots, "logo");
  const hasHero = slotVisible(slots, "hero");
  const hasBadge = slotVisible(slots, "badge");
  const isMobile = input.family === "mobile";
  const heroW = hasHero ? (isMobile ? 28 : 34) : 0;
  const textW = 100 - padX * 2 - heroW - (heroW > 0 ? 2 : 0);
  const logoOffset = hasLogo ? (m.logoMaxHeight / height) * 100 + 2 : 0;
  const ctaH = clamp((m.ctaFontSize + m.ctaPaddingY * 2) / height * 100, 10, 22);
  const textTop = padY + logoOffset;

  return {
    padding: m.padding,
    logo: logoRect(width, height, m.padding, m.logoMaxHeight, designTokens.logoPositionPreset),
    headline: rect(padX, textTop, textW, isMobile ? 38 : 32),
    slogan: rect(padX, textTop + (isMobile ? 14 : 12), textW, isMobile ? 18 : 16),
    hero: hasHero
      ? rect(100 - padX - heroW, padY, heroW, 100 - padY * 2)
      : rect(0, 0, 0, 0),
    cta: rect(
      padX,
      100 - padY - ctaH,
      isMobile ? 36 : 28,
      ctaH,
    ),
    badge: hasBadge
      ? rect(100 - padX - heroW - 14, padY + 2, 12, 14)
      : rect(0, 0, 0, 0),
    headlineFontSize: isMobile ? m.headlineFontSize * 0.85 : m.headlineFontSize,
    sloganFontSize: m.sloganFontSize * (isMobile ? 0.9 : 1),
    ctaFontSize: m.ctaFontSize,
    badgeFontSize: m.badgeFontSize,
    logoMaxHeight: m.logoMaxHeight * (isMobile ? 0.85 : 1),
    ctaPaddingX: m.ctaPaddingX,
    ctaPaddingY: m.ctaPaddingY,
  };
}

function squareLayout(input: ClassicBannerLayoutInput): ClassicBannerComputedLayout {
  const vertical = verticalLayout(input);
  return {
    ...vertical,
    headlineFontSize: vertical.headlineFontSize * 0.92,
    hero: slotVisible(input.slots, "hero")
      ? rect(
          vertical.hero.left,
          vertical.hero.top,
          vertical.hero.width,
          Math.min(vertical.hero.height, 32),
        )
      : vertical.hero,
  };
}

/** Single source of truth for first-pass classic banner layout preview. */
export function computeClassicBannerLayout(
  input: ClassicBannerLayoutInput,
): ClassicBannerComputedLayout {
  switch (input.family) {
    case "vertical":
    case "portrait":
    case "interscroller":
      return verticalLayout(input);
    case "landscape":
    case "mobile":
      return landscapeLayout(input);
    case "square":
      return squareLayout(input);
    default:
      return verticalLayout(input);
  }
}
