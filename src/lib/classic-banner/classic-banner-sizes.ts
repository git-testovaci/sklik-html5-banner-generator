import type {
  ClassicBannerLayoutFamily,
  ClassicBannerSizeDefinition,
} from "@/types/classic-banner";

/** Canonical registry of classic static banner sizes — do not duplicate elsewhere. */
export const CLASSIC_BANNER_SIZES: readonly ClassicBannerSizeDefinition[] = [
  {
    id: "120x600",
    width: 120,
    height: 600,
    family: "vertical",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google skyscraper",
  },
  {
    id: "160x600",
    width: 160,
    height: 600,
    family: "vertical",
    networks: { sklik: true, google: true, microsoft: true },
    note: "Hodně univerzální svislý banner",
  },
  {
    id: "200x200",
    width: 200,
    height: 200,
    family: "square",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google small square",
  },
  {
    id: "240x400",
    width: 240,
    height: 400,
    family: "vertical",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google vertical rectangle",
  },
  {
    id: "250x250",
    width: 250,
    height: 250,
    family: "square",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google square",
  },
  {
    id: "250x360",
    width: 250,
    height: 360,
    family: "vertical",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google triple widescreen",
  },
  {
    id: "300x50",
    width: 300,
    height: 50,
    family: "mobile",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google mobile banner",
  },
  {
    id: "300x250",
    width: 300,
    height: 250,
    family: "landscape",
    networks: { sklik: true, google: true, microsoft: true },
    note: "Nejvíc univerzální formát",
  },
  {
    id: "300x300",
    width: 300,
    height: 300,
    family: "square",
    networks: { sklik: true, google: false, microsoft: false },
    note: "Sklik kostka",
  },
  {
    id: "300x600",
    width: 300,
    height: 600,
    family: "vertical",
    networks: { sklik: true, google: true, microsoft: true },
    note: "Univerzální velký svislý banner",
  },
  {
    id: "300x1050",
    width: 300,
    height: 1050,
    family: "portrait",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google portrait",
  },
  {
    id: "320x50",
    width: 320,
    height: 50,
    family: "mobile",
    networks: { sklik: false, google: true, microsoft: true },
    note: "Google + Microsoft mobil",
  },
  {
    id: "320x100",
    width: 320,
    height: 100,
    family: "mobile",
    networks: { sklik: true, google: true, microsoft: false },
    note: "Sklik + Google velký mobilní banner",
  },
  {
    id: "336x280",
    width: 336,
    height: 280,
    family: "landscape",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google large rectangle",
  },
  {
    id: "468x60",
    width: 468,
    height: 60,
    family: "landscape",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google banner",
  },
  {
    id: "480x300",
    width: 480,
    height: 300,
    family: "landscape",
    networks: { sklik: true, google: false, microsoft: false },
    note: "Sklik vodorovný",
  },
  {
    id: "480x480",
    width: 480,
    height: 480,
    family: "square",
    networks: { sklik: true, google: false, microsoft: false },
    note: "Sklik velká kostka",
  },
  {
    id: "500x200",
    width: 500,
    height: 200,
    family: "landscape",
    networks: { sklik: true, google: false, microsoft: false },
    note: "Sklik vodorovný",
  },
  {
    id: "580x400",
    width: 580,
    height: 400,
    family: "landscape",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google netboard",
  },
  {
    id: "728x90",
    width: 728,
    height: 90,
    family: "landscape",
    networks: { sklik: true, google: true, microsoft: true },
    note: "Univerzální leaderboard",
  },
  {
    id: "930x180",
    width: 930,
    height: 180,
    family: "landscape",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google top banner",
  },
  {
    id: "970x90",
    width: 970,
    height: 90,
    family: "landscape",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google large leaderboard",
  },
  {
    id: "970x210",
    width: 970,
    height: 210,
    family: "landscape",
    networks: { sklik: true, google: false, microsoft: false },
    note: "Sklik velký vodorovný",
  },
  {
    id: "970x250",
    width: 970,
    height: 250,
    family: "landscape",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google billboard",
  },
  {
    id: "970x310",
    width: 970,
    height: 310,
    family: "landscape",
    networks: { sklik: true, google: false, microsoft: false },
    note: "Sklik velký brandingový formát",
  },
  {
    id: "980x120",
    width: 980,
    height: 120,
    family: "landscape",
    networks: { sklik: false, google: true, microsoft: false },
    note: "Google panorama",
  },
  {
    id: "720x1280",
    width: 720,
    height: 1280,
    family: "interscroller",
    networks: { sklik: true, google: false, microsoft: false },
    note: "Sklik interscroller",
  },
] as const;

export const CLASSIC_BANNER_MASTER_SIZE_ID = "300x600";

export function getClassicBannerSizeById(
  sizeId: string,
): ClassicBannerSizeDefinition | undefined {
  return CLASSIC_BANNER_SIZES.find((s) => s.id === sizeId);
}

export function classicBannerSizeLabel(size: ClassicBannerSizeDefinition): string {
  return `${size.width}×${size.height}`;
}

export function classicBannerFamilyLabel(family: ClassicBannerLayoutFamily): string {
  switch (family) {
    case "vertical":
      return "Svislý";
    case "square":
      return "Čtverec";
    case "landscape":
      return "Vodorovný";
    case "mobile":
      return "Mobilní";
    case "portrait":
      return "Portrait";
    case "interscroller":
      return "Interscroller";
    default:
      return family;
  }
}
