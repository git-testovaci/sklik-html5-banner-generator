export interface BannerSize {
  width: number;
  height: number;
  label: string;
}

export const BANNER_SIZES: readonly BannerSize[] = [
  { width: 300, height: 250, label: "300×250" },
  { width: 300, height: 600, label: "300×600" },
  { width: 320, height: 100, label: "320×100" },
  { width: 728, height: 90, label: "728×90" },
  { width: 970, height: 310, label: "970×310" },
  { width: 480, height: 300, label: "480×300" },
  { width: 480, height: 480, label: "480×480" },
  { width: 300, height: 300, label: "300×300" },
  { width: 500, height: 200, label: "500×200" },
  { width: 160, height: 600, label: "160×600" },
] as const;

export function formatBannerSize(width: number, height: number): string {
  return `${width}×${height}`;
}
