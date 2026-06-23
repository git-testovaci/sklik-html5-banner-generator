"use client";

import type { LayerAnimation } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import {
  clampTiming,
  defaultTimeline,
  energeticAnimations,
  noAnimations,
  staggerEntranceAnimations,
  subtleAnimations,
} from "@/lib/animation/timeline-utils";
import { TimelineTrack } from "./TimelineTrack";

interface TimelinePanelProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
}

const DURATION_PRESETS = [1500, 3000, 5000, 8000];

export function TimelinePanel({ state, onUpdate }: TimelinePanelProps) {
  const durationMs = state.timeline?.durationMs ?? defaultTimeline().durationMs;
  const durationWarn = durationMs > 6000;

  function updateTimeline(patch: Partial<BannerEditorState["timeline"]>) {
    onUpdate({ timeline: { ...defaultTimeline(), ...state.timeline, ...patch } });
  }

  function updateLayerAnim(layerId: string, patch: Partial<LayerAnimation>) {
    onUpdate({
      layerAnimations: (state.layerAnimations ?? []).map((a) => {
        if (a.layerId !== layerId) return a;
        const merged = { ...a, ...patch };
        const timing = clampTiming(merged.startMs, merged.durationMs, durationMs);
        return { ...merged, startMs: timing.startMs, durationMs: timing.durationMs };
      }),
    });
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="space-y-3 border-b border-zinc-800/60 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-300">Animation timeline</h2>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={state.timeline?.loop ?? false}
              onChange={(e) => updateTimeline({ loop: e.target.checked })}
              className="rounded border-zinc-600"
            />
            Loop preview
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500">Duration:</span>
          {DURATION_PRESETS.map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => updateTimeline({ durationMs: ms })}
              className={`rounded border px-2 py-0.5 ${
                durationMs === ms
                  ? "border-violet-600 bg-violet-950/40 text-violet-200"
                  : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {ms / 1000}s
            </button>
          ))}
          <input
            type="number"
            min={500}
            max={8000}
            step={100}
            value={durationMs}
            onChange={(e) => updateTimeline({ durationMs: Math.max(500, Number(e.target.value)) })}
            className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-100"
          />
          <span className="text-zinc-600">ms</span>
        </div>
        {durationWarn ? (
          <p className="text-xs text-amber-400">Long timeline — keep banner animations short for Sklik.</p>
        ) : null}
        <div className="flex flex-wrap gap-1">
          {[
            { label: "Stagger entrance", fn: staggerEntranceAnimations },
            { label: "No animation", fn: noAnimations },
            { label: "Subtle", fn: subtleAnimations },
            { label: "Energetic", fn: energeticAnimations },
          ].map(({ label, fn }) => (
            <button
              key={label}
              type="button"
              onClick={() => onUpdate({ layerAnimations: fn() })}
              className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto p-4">
        <div className="min-w-[480px] space-y-2">
          {(state.layerAnimations ?? []).map((anim) => (
            <TimelineTrack
              key={anim.layerId}
              animation={anim}
              timelineDurationMs={durationMs}
              onChange={(patch) => updateLayerAnim(anim.layerId, patch)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
