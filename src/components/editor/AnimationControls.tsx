"use client";

import { ANIMATION_PRESETS } from "@/types/animation";
import type { LayerAnimation } from "@/types/animation";

interface AnimationControlsProps {
  animation: LayerAnimation;
  timelineDurationMs: number;
  onChange: (patch: Partial<LayerAnimation>) => void;
}

export function AnimationControls({
  animation,
  timelineDurationMs,
  onChange,
}: AnimationControlsProps) {
  return (
    <div className="space-y-2 text-xs">
      <label className="flex items-center gap-2 text-zinc-400">
        <input
          type="checkbox"
          checked={animation.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
        />
        Enable animation
      </label>
      <select
        value={animation.preset}
        onChange={(e) => onChange({ preset: e.target.value as LayerAnimation["preset"] })}
        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
      >
        {ANIMATION_PRESETS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <label>
          Start (ms)
          <input
            type="number"
            min={0}
            max={timelineDurationMs}
            value={animation.startMs}
            onChange={(e) => onChange({ startMs: Number(e.target.value) })}
            className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
          />
        </label>
        <label>
          Duration (ms)
          <input
            type="number"
            min={100}
            value={animation.durationMs}
            onChange={(e) => onChange({ durationMs: Number(e.target.value) })}
            className="mt-0.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
          />
        </label>
      </div>
    </div>
  );
}
