"use client";

import { ANIMATION_EASINGS, ANIMATION_PRESETS } from "@/types/animation";
import type { LayerAnimation } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import { clampTiming, defaultTimeline } from "@/lib/animation/timeline-utils";
import { TimelineTrack } from "./TimelineTrack";

interface TimelinePanelProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
}

export function TimelinePanel({ state, onUpdate }: TimelinePanelProps) {
  function updateTimeline(patch: Partial<BannerEditorState["timeline"]>) {
    onUpdate({ timeline: { ...defaultTimeline(), ...state.timeline, ...patch } });
  }

  function updateLayerAnim(layerId: string, patch: Partial<LayerAnimation>) {
    onUpdate({
      layerAnimations: (state.layerAnimations ?? []).map((a) => {
        if (a.layerId !== layerId) return a;
        const merged = { ...a, ...patch };
        const timing = clampTiming(
          merged.startMs,
          merged.durationMs,
          state.timeline?.durationMs ?? defaultTimeline().durationMs,
        );
        return { ...merged, startMs: timing.startMs, durationMs: timing.durationMs };
      }),
    });
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Animation timeline</h2>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 text-zinc-400">
            Duration
            <input
              type="number"
              min={500}
              max={8000}
              step={100}
              value={state.timeline?.durationMs ?? defaultTimeline().durationMs}
              onChange={(e) =>
                updateTimeline({ durationMs: Math.max(500, Number(e.target.value)) })
              }
              className="w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
            />
            ms
          </label>
          <label className="flex items-center gap-2 text-zinc-400">
            <input
              type="checkbox"
              checked={state.timeline?.loop ?? false}
              onChange={(e) => updateTimeline({ loop: e.target.checked })}
              className="rounded border-zinc-600"
            />
            Loop preview
          </label>
        </div>
      </div>
      <div className="overflow-x-auto p-4">
        <div className="min-w-[480px] space-y-2">
          {state.layerAnimations?.map((anim) => (
            <TimelineTrack
              key={anim.layerId}
              animation={anim}
              timelineDurationMs={state.timeline?.durationMs ?? defaultTimeline().durationMs}
              onChange={(patch) => updateLayerAnim(anim.layerId, patch)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export { ANIMATION_PRESETS, ANIMATION_EASINGS };
