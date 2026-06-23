"use client";

import { useState } from "react";
import type { LayerEffect } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import {
  deleteLayerEffect,
  getActiveScene,
  getEffectsForScene,
  getLayerById,
  getLayersForScene,
  updateLayerEffect,
} from "@/lib/animation/storyboard-utils";
import { duplicateEffect } from "@/lib/animation/keyframe-utils";
import {
  effectGroupForLayer,
  transitionFriendlyLabel,
} from "@/lib/animation/effect-labels";
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const durationMs = scene?.durationMs ?? 3000;
  const effects = scene ? getEffectsForScene(state, scene.id) : [];
  const layers = scene ? getLayersForScene(state, scene.id) : [];
  const persistentIds = new Set(layers.filter((l) => l.persistent).map((l) => l.id));

  const grouped = new Map<string, LayerEffect[]>();
  for (const effect of effects) {
    const layer = getLayerById(state, effect.layerId);
    const group = effectGroupForLayer(layer);
    const list = grouped.get(group) ?? [];
    list.push(effect);
    grouped.set(group, list);
  }

  if (!scene) return null;

  function updateEffect(effectId: string, patch: Partial<LayerEffect>) {
    onUpdate(updateLayerEffect(state, effectId, patch));
  }

  const compactLimit = 4;
  const needsCollapse = effects.length > compactLimit;
  const visibleEffects = showAdvanced || !needsCollapse ? effects : effects.slice(0, compactLimit);

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-medium text-zinc-300">Časování animací</h2>
          <p className="text-[10px] text-zinc-500">
            {scene.name} · {(durationMs / 1000).toFixed(1)} s · {effects.length} animací
          </p>
          <p className="mt-0.5 text-[10px] text-zinc-600">
            Přetáhněte fialový pruh pro změnu času animace.
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
              Duplikovat
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdate(deleteLayerEffect(state, selectedEffectId));
                onSelectEffect(null);
              }}
              className="rounded border border-red-900/50 px-2 py-0.5 text-[10px] text-red-400"
            >
              Smazat
            </button>
          </div>
        ) : null}
      </div>

      <div className="border-b border-zinc-800/40 px-4 py-2">
        <p className="text-[10px] text-zinc-500">
          Přechod na další scénu:{" "}
          <span className="text-zinc-300">{transitionFriendlyLabel(scene.transitionOut)}</span>
        </p>
      </div>

      <div className="max-h-56 space-y-3 overflow-y-auto p-4">
        {effects.length === 0 ? (
          <p className="text-xs text-zinc-500">
            Na této scéně zatím nejsou animace — použijte rychlé motion presety nebo Inspector.
          </p>
        ) : (
          <>
            {[...grouped.entries()].map(([group, groupEffects]) => {
              const shown = groupEffects.filter((e) => visibleEffects.some((v) => v.id === e.id));
              if (shown.length === 0) return null;
              return (
                <div key={group}>
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                    {group}
                  </p>
                  <div className="space-y-1.5">
                    {shown.map((effect) => (
                      <KeyframeTrack
                        key={effect.id}
                        effect={effect}
                        state={state}
                        timelineDurationMs={durationMs}
                        selected={effect.id === selectedEffectId}
                        persistent={persistentIds.has(effect.layerId)}
                        onSelect={() => onSelectEffect(effect.id)}
                        onChange={(patch) => updateEffect(effect.id, patch)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {needsCollapse ? (
        <div className="border-t border-zinc-800/60 px-4 py-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-[10px] text-violet-400 hover:underline"
          >
            {showAdvanced
              ? "Skrýt detailní časování"
              : `Upravit detailní časování (${effects.length - compactLimit} dalších)`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
