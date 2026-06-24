"use client";

import type { BannerSceneTransition } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import {
  getActiveScene,
  setActiveScene,
  updateScene,
} from "@/lib/animation/storyboard-utils";
import { SceneCard } from "./SceneCard";
import { SceneControls } from "./SceneControls";
import { SceneTransitionChip } from "./SceneTransitionChip";

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
  selectedTransitionSceneId,
  onSelectTransition,
  onPreviewTransition,
}: SceneStripProps) {
  const scenes = state.scenes ?? [];
  const active = getActiveScene(state);
  const highlightId = playbackSceneId ?? active?.id;
  const loopEnabled = state.timeline?.loop ?? false;

  if (scenes.length === 0) return null;

  function selectScene(sceneId: string) {
    if (onSceneSelect) {
      onSceneSelect(sceneId);
    } else {
      onUpdate(setActiveScene(state, sceneId));
    }
  }

  function changeTransition(sceneId: string, transition: BannerSceneTransition) {
    onUpdate(updateScene(state, sceneId, { transitionOut: transition }));
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-2">
        <h2 className="text-sm font-medium text-zinc-300">Scény</h2>
        <p className="text-[10px] text-zinc-500">
          {scenes.length} scén · {(scenes.reduce((s, sc) => s + sc.durationMs, 0) / 1000).toFixed(1)} s celkem
        </p>
      </div>
      <div className="flex items-center gap-0 overflow-x-auto p-3">
        {scenes.map((scene, i) => (
          <div key={scene.id} className="flex items-center">
            <SceneCard
              scene={scene}
              index={i}
              active={scene.id === highlightId}
              onSelect={() => selectScene(scene.id)}
            />
            <SceneTransitionChip
              scene={scene}
              isLast={i === scenes.length - 1}
              loopEnabled={loopEnabled}
              active={selectedTransitionSceneId === scene.id}
              onSelect={() => {
                selectScene(scene.id);
                onSelectTransition?.(scene.id);
              }}
              onChange={(transition) => changeTransition(scene.id, transition)}
            />
          </div>
        ))}
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
