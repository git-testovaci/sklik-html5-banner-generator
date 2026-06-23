"use client";

import type { LayerEffect } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import {
  deleteLayerEffect,
  getActiveScene,
  getEffectsForScene,
  getLayersForScene,
  updateLayerEffect,
} from "@/lib/animation/storyboard-utils";
import { duplicateEffect } from "@/lib/animation/keyframe-utils";
import { KeyframeTrack } from "./KeyframeTrack";

interface KeyframeTimelineProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  selectedEffectId: string | null;
  onSelectEffect: (effectId: string | null) => void;
}

export function KeyframeTimeline({
  state,
  onUpdate,
  selectedEffectId,
  onSelectEffect,
}: KeyframeTimelineProps) {
  const scene = getActiveScene(state);
  if (!scene) return null;

  const durationMs = scene.durationMs;
  const effects = getEffectsForScene(state, scene.id);
  const layers = getLayersForScene(state, scene.id);
  const persistentIds = new Set(layers.filter((l) => l.persistent).map((l) => l.id));

  function updateEffect(effectId: string, patch: Partial<LayerEffect>) {
    onUpdate(updateLayerEffect(state, effectId, patch));
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-medium text-zinc-300">Effect timeline</h2>
          <p className="text-[10px] text-zinc-500">
            {scene.name} · {durationMs}ms · {effects.length} effect(s)
          </p>
        </div>
        {selectedEffectId ? (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                const dup = duplicateEffect(state, selectedEffectId);
                if (dup) onUpdate(dup.state);
              }}
              className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate(deleteLayerEffect(state, selectedEffectId));
                onSelectEffect(null);
              }}
              className="rounded border border-red-900/50 px-2 py-0.5 text-[10px] text-red-400"
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        {effects.length === 0 ? (
          <p className="text-xs text-zinc-500">No effects — use Quick motion or Inspector.</p>
        ) : (
          effects.map((effect) => (
            <KeyframeTrack
              key={effect.id}
              effect={effect}
              timelineDurationMs={durationMs}
              selected={effect.id === selectedEffectId}
              persistent={persistentIds.has(effect.layerId)}
              onSelect={() => onSelectEffect(effect.id)}
              onChange={(patch) => updateEffect(effect.id, patch)}
            />
          ))
        )}
      </div>
    </section>
  );
}
