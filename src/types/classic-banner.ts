/** Canonical classic static banner model — single source of truth for slot/variant types. */

export type ClassicBannerSlotId =
  | "background"
  | "logo"
  | "headline"
  | "slogan"
  | "hero"
  | "cta"
  | "badge"
  | "decoration";

export type ClassicBannerLayerRole = ClassicBannerSlotId;

export type ClassicBannerLayoutFamily =
  | "vertical"
  | "square"
  | "landscape"
  | "mobile"
  | "portrait"
  | "interscroller";

export type ClassicBannerAdNetwork = "sklik" | "google" | "microsoft";

export interface ClassicBannerNetworkSupport {
  sklik: boolean;
  google: boolean;
  microsoft: boolean;
}

export interface ClassicBannerSizeDefinition {
  id: string;
  width: number;
  height: number;
  family: ClassicBannerLayoutFamily;
  networks: ClassicBannerNetworkSupport;
  note: string;
}

export type ClassicBannerVariantStatus = "master" | "derived" | "placeholder";

export interface ClassicBannerVariantLayoutPlaceholder {
  family: ClassicBannerLayoutFamily;
  status: "pending" | "ready";
}

export interface ClassicBannerDesignTokens {
  fontFamily: string;
  headlineFontWeight: number;
  bodyFontWeight: number;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  ctaBackgroundColor: string;
  ctaTextColor: string;
  badgeBackgroundColor: string;
  badgeTextColor: string;
  borderRadius: number;
  spacingScale: number;
  logoPositionPreset: "top-left" | "top-center" | "top-right";
}

export interface ClassicBannerContent {
  backgroundUrl: string;
  logoUrl: string;
  headline: string;
  slogan: string;
  heroImageUrl: string;
  ctaText: string;
  badgeText: string;
}

export interface ClassicBannerSlot {
  id: ClassicBannerSlotId;
  visible: boolean;
  label: string;
}

export interface ClassicBannerSizeVariant {
  sizeId: string;
  width: number;
  height: number;
  family: ClassicBannerLayoutFamily;
  status: ClassicBannerVariantStatus;
  layout: ClassicBannerVariantLayoutPlaceholder;
}

export interface ClassicBannerProjectData {
  masterSizeId: string;
  content: ClassicBannerContent;
  designTokens: ClassicBannerDesignTokens;
  slots: ClassicBannerSlot[];
  variants: ClassicBannerSizeVariant[];
}
