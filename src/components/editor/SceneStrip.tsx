"use client";

import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import {
  addScene,
  getActiveScene,
  setActiveScene,
} from "@/lib/animation/storyboard-utils";
import { totalBannerDurationMs } from "@/lib/animation/global-timeline-utils";

interface SceneStripProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  onSceneSelect?: (sceneId: string) => void;
  playbackSceneId?: string | null;
  onPreviewTransition?: (sceneId: string) => void;
}

/** Compact scene navigator — not a timeline. Main editing timeline is GlobalBannerTimeline. */
export function SceneStrip({
  state,
  onUpdate,
  onSceneSelect,
  playbackSceneId,
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
    <nav
      aria-label="Scény — navigace"
      className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-800/40 bg-zinc-950/30 px-2 py-1.5"
    >
      <span className="shrink-0 text-[10px] font-medium text-zinc-600">Scény / navigace</span>
      <span className="hidden text-[9px] text-zinc-700 sm:inline">· {totalSec} s celkem</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {scenes.map((scene, i) => {
          const isActive = scene.id === highlightId;
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => selectScene(scene.id)}
              className={`shrink-0 rounded border px-2 py-0.5 text-[10px] transition-colors ${
                isActive
                  ? "border-violet-600/50 bg-violet-950/40 text-violet-200"
                  : "border-zinc-800/60 bg-zinc-900/30 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
              }`}
              title={`Přejít na ${scene.name}`}
            >
              {i + 1}. {scene.name}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onUpdate(addScene(state))}
        className="shrink-0 rounded border border-zinc-800/60 px-2 py-0.5 text-[10px] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
        title="Přidat scénu"
      >
        + Scéna
      </button>
    </nav>
  );
}
