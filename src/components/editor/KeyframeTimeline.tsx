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
  getSceneTransitionDurationMs,
  updateLayerEffect,
} from "@/lib/animation/storyboard-utils";
import { duplicateEffect } from "@/lib/animation/keyframe-utils";
import {
  effectGroupForLayer,
  effectStoryLine,
  transitionFriendlyLabel,
} from "@/lib/animation/effect-labels";
import { KeyframeTrack } from "./KeyframeTrack";

interface KeyframeTimelineProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  selectedEffectId: string | null;
  onSelectEffect: (effectId: string | null) => void;
  forceExpandAdvanced?: boolean;
  onExpanded?: () => void;
}

const STORY_PREVIEW_LIMIT = 6;

export function KeyframeTimeline({
  state,
  onUpdate,
  selectedEffectId,
  onSelectEffect,
  forceExpandAdvanced = false,
  onExpanded,
}: KeyframeTimelineProps) {
  const scene = getActiveScene(state);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAllStory, setShowAllStory] = useState(false);
  const showDetailed = showAdvanced || forceExpandAdvanced;

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

  const sortedStory = [...effects].sort((a, b) => a.startMs - b.startMs);
  const transitionAt = Math.max(0, durationMs - getSceneTransitionDurationMs(scene));
  const visibleStory = showAllStory
    ? sortedStory
    : sortedStory.slice(0, STORY_PREVIEW_LIMIT);

  return (
    <section
      id="keyframe-timeline"
      className="rounded-xl border border-zinc-800/80 bg-zinc-900/40"
    >
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-medium text-zinc-300">Časová osa</h2>
          <p className="text-[10px] text-zinc-500">
            {scene.name} · {(durationMs / 1000).toFixed(1)} s
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

      <div className="border-b border-zinc-800/40 px-4 py-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Příběh animace
        </p>
        {sortedStory.length === 0 ? (
          <p className="text-xs text-zinc-500">Zatím žádné animace — použijte rychlé presety.</p>
        ) : (
          <>
            <ul className="space-y-1">
              {visibleStory.map((effect) => (
                <li key={effect.id}>
                  <button
                    type="button"
                    onClick={() => onSelectEffect(effect.id)}
                    className={`w-full rounded px-2 py-1 text-left text-[11px] ${
                      effect.id === selectedEffectId
                        ? "bg-violet-950/40 text-violet-200"
                        : "text-zinc-400 hover:bg-zinc-800/40"
                    }`}
                  >
                    {effectStoryLine(state, effect)}
                  </button>
                </li>
              ))}
              <li className="rounded px-2 py-1 text-[11px] text-zinc-500">
                {(transitionAt / 1000).toFixed(1)} s — Přechod:{" "}
                {transitionFriendlyLabel(scene.transitionOut)}
              </li>
            </ul>
            {sortedStory.length > STORY_PREVIEW_LIMIT && !showAllStory ? (
              <button
                type="button"
                onClick={() => setShowAllStory(true)}
                className="mt-2 text-[10px] text-violet-400 hover:underline"
              >
                Zobrazit vše ({sortedStory.length - STORY_PREVIEW_LIMIT} dalších)
              </button>
            ) : null}
          </>
        )}
      </div>

      {showDetailed ? (
        <div className="max-h-56 space-y-3 overflow-y-auto p-4">
          {[...grouped.entries()].map(([group, groupEffects]) => (
            <div key={group}>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                {group}
              </p>
              <div className="space-y-1.5">
                {groupEffects.map((effect) => (
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
          ))}
        </div>
      ) : null}

      <div className="border-t border-zinc-800/60 px-4 py-2">
        <button
          type="button"
          onClick={() => {
            setShowAdvanced((v) => !v);
            onExpanded?.();
          }}
          className="text-[10px] text-violet-400 hover:underline"
        >
          {showDetailed ? "Skrýt detailní časování" : "Upravit detailní časování"}
        </button>
      </div>
    </section>
  );
}
