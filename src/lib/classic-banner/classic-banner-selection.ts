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
  "logo",
  "hero",
]);

export function isClassicEditableSlotId(value: string): value is ClassicEditableSlotId {
  return (CLASSIC_EDITABLE_SLOTS as readonly string[]).includes(value);
}
