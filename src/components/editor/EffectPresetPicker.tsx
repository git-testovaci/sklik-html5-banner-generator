"use client";

import type { EffectPreset } from "@/types/animation";
import { effectPresetDefaults } from "@/lib/animation/effect-presets";

interface EffectPresetPickerProps {
  value: EffectPreset;
  onChange: (preset: EffectPreset) => void;
  category?: "text" | "image" | "scene" | "particle" | "badge";
}

const ALL_PRESETS: EffectPreset[] = [
  "enter-from-top",
  "enter-from-bottom",
  "fade-in",
  "underline-draw",
  "slight-drop-in",
  "slide-in-left",
  "zoom-in",
  "zoom-rotate-in",
  "flip-in-y",
  "flip-180",
  "zoom-rotate-badge",
  "bounce-in",
  "dust-to-clean",
  "air-particles",
  "scene-swipe-left",
  "scene-swipe-right",
  "scene-fade",
];

export function EffectPresetPicker({ value, onChange, category }: EffectPresetPickerProps) {
  const options = category
    ? ALL_PRESETS.filter((p) => effectPresetDefaults(p).category === category)
    : ALL_PRESETS;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as EffectPreset)}
      className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200"
    >
      {options.map((p) => (
        <option key={p} value={p}>
          {effectPresetDefaults(p).label}
        </option>
      ))}
    </select>
  );
}
