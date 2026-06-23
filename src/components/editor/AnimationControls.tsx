"use client";

import {
  ANIMATION_EASINGS,
  ANIMATION_ENTER_FROM,
  ANIMATION_PRESETS,
  presetDefaultEnterFrom,
} from "@/types/animation";
import type { LayerAnimation } from "@/types/animation";
import { clampTiming } from "@/lib/animation/timeline-utils";

interface AnimationControlsProps {
  animation: LayerAnimation;
  timelineDurationMs: number;
  onChange: (patch: Partial<LayerAnimation>) => void;
}

function NumField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] text-zinc-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
      />
    </label>
  );
}

export function AnimationControls({
  animation,
  timelineDurationMs,
  onChange,
}: AnimationControlsProps) {
  function applyTiming(startMs: number, durationMs: number) {
    const t = clampTiming(startMs, durationMs, timelineDurationMs);
    onChange({ startMs: t.startMs, durationMs: t.durationMs });
  }

  return (
    <div className="space-y-2 border-t border-zinc-800/60 pt-2 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="Starts at (ms)"
          value={animation.startMs}
          min={0}
          max={timelineDurationMs}
          onChange={(v) => applyTiming(v, animation.durationMs)}
        />
        <NumField
          label="Duration (ms)"
          value={animation.durationMs}
          min={100}
          max={timelineDurationMs}
          onChange={(v) => applyTiming(animation.startMs, v)}
        />
      </div>
      <label className="block">
        <span className="mb-0.5 block text-[10px] text-zinc-500">Comes from</span>
        <select
          value={animation.enterFrom ?? "none"}
          onChange={(e) =>
            onChange({ enterFrom: e.target.value as LayerAnimation["enterFrom"] })
          }
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
        >
          {ANIMATION_ENTER_FROM.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="Distance (px)"
          value={animation.distancePx}
          min={0}
          max={120}
          onChange={(v) => onChange({ distancePx: v })}
        />
        <label className="block">
          <span className="mb-0.5 block text-[10px] text-zinc-500">Easing</span>
          <select
            value={animation.easing}
            onChange={(e) =>
              onChange({ easing: e.target.value as LayerAnimation["easing"] })
            }
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
          >
            {ANIMATION_EASINGS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="Opacity from"
          value={animation.opacityFrom}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onChange({ opacityFrom: v })}
        />
        <NumField
          label="Opacity to"
          value={animation.opacityTo}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onChange({ opacityTo: v })}
        />
        <NumField
          label="Scale from"
          value={animation.scaleFrom}
          min={0.1}
          max={2}
          step={0.05}
          onChange={(v) => onChange({ scaleFrom: v })}
        />
        <NumField
          label="Scale to"
          value={animation.scaleTo}
          min={0.1}
          max={2}
          step={0.05}
          onChange={(v) => onChange({ scaleTo: v })}
        />
      </div>
      <label className="block">
        <span className="mb-0.5 block text-[10px] text-zinc-500">Preset</span>
        <select
          value={animation.preset}
          onChange={(e) => {
            const preset = e.target.value as LayerAnimation["preset"];
            onChange({ preset, enterFrom: presetDefaultEnterFrom(preset) });
          }}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
        >
          {ANIMATION_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
