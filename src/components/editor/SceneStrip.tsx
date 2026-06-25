"use client";

import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import {
  getActiveScene,
  setActiveScene,
} from "@/lib/animation/storyboard-utils";
import { totalBannerDurationMs } from "@/lib/animation/global-timeline-utils";
import { SceneControls } from "./SceneControls";

interface SceneStripProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  onSceneSelect?: (sceneId: string) => void;
  playbackSceneId?: string | null;
  selectedTransitionSceneId?: string | null;
  onSelectTransition?: (sceneId: string) => void;
  onPreviewTransition?: (sceneId: string) => void;
}

export function SceneStrip({
  state,
  onUpdate,
  onSceneSelect,
  playbackSceneId,
  onPreviewTransition,
}: SceneStripProps) {
  const scenes = state.scenes ?? [];
  const active = getActiveScene(state);
  const highlightId = playbackSceneId ?? active?.id;
  const totalSec = (totalBannerDurationMs(state) / 1000).toFixed(1);

  if (scenes.length === 0) return null;

  function selectScene(sceneId: string) {
    if (onSceneSelect) {
      onSceneSelect(sceneId);
    } else {
      onUpdate(setActiveScene(state, sceneId), { history: "skip" });
    }
  }

  return (
    <section className="rounded-lg border border-zinc-800/50 bg-zinc-950/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/40 px-3 py-1.5">
        <div>
          <h2 className="text-[11px] font-medium text-zinc-500">Scény · navigace</h2>
          <p className="text-[9px] text-zinc-600">
            {scenes.length} scén · {totalSec} s · přechody upravte v hlavní časové ose
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto px-2 py-2">
        {scenes.map((scene, i) => {
          const isActive = scene.id === highlightId;
          const durSec = (scene.durationMs / 1000).toFixed(1);
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => selectScene(scene.id)}
              className={`shrink-0 rounded-md border px-2.5 py-1 text-left transition-colors ${
                isActive
                  ? "border-violet-600/60 bg-violet-950/30 text-violet-200"
                  : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
              }`}
              title={`Přejít na začátek scény · ${durSec} s`}
            >
              <span className="text-[10px] font-medium">
                {i + 1}. {scene.name}
              </span>
              <span className="ml-1.5 text-[9px] text-zinc-600">{durSec} s</span>
            </button>
          );
        })}
      </div>
      <SceneControls
        state={state}
        onUpdate={onUpdate}
        onPreviewTransition={
          active ? () => onPreviewTransition?.(active.id) : undefined
        }
      />
    </section>
  );
}
