"use client";

import type { LayerAnimation } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater, SelectedLayer } from "@/types/editor";
import {
  clampTiming,
  defaultTimeline,
  energeticAnimations,
  layerAnimIdForAsset,
  noAnimations,
  staggerEntranceAnimations,
  subtleAnimations,
} from "@/lib/animation/timeline-utils";
import { TimelineTrack } from "./TimelineTrack";

interface TimelinePanelProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  selectedLayer: SelectedLayer;
  onReplay: () => void;
}

const DURATION_PRESETS = [1500, 3000, 5000, 8000];

function selectedLayerAnimId(selected: SelectedLayer, state: BannerEditorState): string | null {
  if (selected.type === "text") return selected.id;
  const placement = (state.assetPlacements ?? []).find((p) => p.assetId === selected.id);
  if (!placement) return null;
  return layerAnimIdForAsset(placement.kind, placement.assetId);
}

export function TimelinePanel({
  state,
  onUpdate,
  selectedLayer,
  onReplay,
}: TimelinePanelProps) {
  const durationMs = state.timeline?.durationMs ?? defaultTimeline().durationMs;
  const durationWarn = durationMs > 6000;
  const selectedAnimId = selectedLayerAnimId(selectedLayer, state);

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

  const rulerMarks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="space-y-3 border-b border-zinc-800/60 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-300">Animation timeline</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReplay}
              className="rounded border border-violet-700/60 bg-violet-950/40 px-2 py-1 text-xs text-violet-200 hover:bg-violet-900/40"
            >
              Replay
            </button>
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
        <div className="relative h-4 rounded bg-zinc-800/50">
          {rulerMarks.map((pct) => (
            <span
              key={pct}
              className="absolute top-0 text-[9px] text-zinc-600"
              style={{ left: `${pct * 100}%`, transform: "translateX(-50%)" }}
            >
              {pct === 1 ? `${durationMs}ms` : `${Math.round(durationMs * pct)}ms`}
            </span>
          ))}
        </div>
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
              selected={anim.layerId === selectedAnimId}
              onChange={(patch) => updateLayerAnim(anim.layerId, patch)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
