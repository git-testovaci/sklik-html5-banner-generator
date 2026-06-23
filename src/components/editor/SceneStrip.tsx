"use client";

import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import { getActiveScene, setActiveScene } from "@/lib/animation/storyboard-utils";
import { SceneCard } from "./SceneCard";
import { SceneControls } from "./SceneControls";

interface SceneStripProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  playbackSceneId?: string | null;
}

export function SceneStrip({ state, onUpdate, playbackSceneId }: SceneStripProps) {
  const scenes = state.scenes ?? [];
  const active = getActiveScene(state);
  const highlightId = playbackSceneId ?? active?.id;

  if (scenes.length === 0) return null;

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-2">
        <h2 className="text-sm font-medium text-zinc-300">Storyboard</h2>
        <p className="text-[10px] text-zinc-500">
          {scenes.length} scene(s) · {scenes.reduce((s, sc) => s + sc.durationMs, 0)}ms total
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto p-3">
        {scenes.map((scene, i) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            index={i}
            active={scene.id === highlightId}
            onSelect={() => onUpdate(setActiveScene(state, scene.id))}
          />
        ))}
      </div>
      <SceneControls state={state} onUpdate={onUpdate} />
    </section>
  );
}
