"use client";

import { ANIMATION_EASINGS, ANIMATION_PRESETS } from "@/types/animation";
import type { LayerAnimation } from "@/types/animation";

interface TimelineTrackProps {
  animation: LayerAnimation;
  timelineDurationMs: number;
  onChange: (patch: Partial<LayerAnimation>) => void;
}

export function TimelineTrack({
  animation,
  timelineDurationMs,
  onChange,
}: TimelineTrackProps) {
  const leftPct = (animation.startMs / timelineDurationMs) * 100;
  const widthPct = (animation.durationMs / timelineDurationMs) * 100;

  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-2">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={animation.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="rounded border-zinc-600"
          />
          <span className="capitalize">{animation.layerType}</span>
        </label>
        <select
          value={animation.preset}
          onChange={(e) =>
            onChange({ preset: e.target.value as LayerAnimation["preset"] })
          }
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-100"
        >
          {ANIMATION_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={timelineDurationMs}
          value={animation.startMs}
          onChange={(e) => onChange({ startMs: Number(e.target.value) })}
          className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-xs text-zinc-100"
          title="Start ms"
        />
        <input
          type="number"
          min={100}
          value={animation.durationMs}
          onChange={(e) => onChange({ durationMs: Number(e.target.value) })}
          className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-xs text-zinc-100"
          title="Duration ms"
        />
        <select
          value={animation.easing}
          onChange={(e) =>
            onChange({ easing: e.target.value as LayerAnimation["easing"] })
          }
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-100"
        >
          {ANIMATION_EASINGS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
      <div className="relative h-4 rounded bg-zinc-800/80">
        {animation.enabled && animation.preset !== "none" ? (
          <div
            className="absolute top-0.5 h-3 rounded bg-violet-600/70"
            style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
            title={`${animation.startMs}ms – ${animation.startMs + animation.durationMs}ms`}
          />
        ) : null}
      </div>
    </div>
  );
}
