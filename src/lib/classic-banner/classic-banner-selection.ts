import type { ClassicEditableSlotId } from "@/types/classic-banner";

/** Editable canvas layers in default paint order (low → high z-index). */
export const CLASSIC_EDITABLE_SLOTS: readonly ClassicEditableSlotId[] = [
  "background",
  "hero",
  "headline",
  "slogan",
  "logo",
  "cta",
  "badge",
] as const;

export const CLASSIC_SLOT_CZECH_NAMES: Record<ClassicEditableSlotId, string> = {
  background: "Pozadí",
  logo: "Logo",
  headline: "Nadpis",
  slogan: "Slogan",
  hero: "Obrázek",
  cta: "Tlačítko",
  badge: "Štítek",
};

/** Image slots preserve aspect ratio on corner resize unless Shift is held. */
export const CLASSIC_ASPECT_RATIO_SLOTS: ReadonlySet<ClassicEditableSlotId> = new Set([
  "background",
  "logo",
  "hero",
]);

export type ClassicBannerResizeCorner = "tl" | "tr" | "bl" | "br";

export const CLASSIC_RESIZE_CORNER_OPPOSITE: Record<
  ClassicBannerResizeCorner,
  ClassicBannerResizeCorner
> = {
  tl: "br",
  tr: "bl",
  bl: "tr",
  br: "tl",
};

export function isClassicEditableSlotId(value: string): value is ClassicEditableSlotId {
  return (CLASSIC_EDITABLE_SLOTS as readonly string[]).includes(value);
}
