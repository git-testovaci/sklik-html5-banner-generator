"use client";

import type { BannerScene, BannerSceneTransition } from "@/types/animation";
import { SCENE_TRANSITIONS } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import {
  addScene,
  applyTransitionToAllScenes,
  deleteScene,
  duplicateScene,
  getSceneTransitionDurationMs,
  moveScene,
  updateScene,
} from "@/lib/animation/storyboard-utils";
import { transitionFriendlyLabel } from "@/lib/animation/effect-labels";

interface SceneControlsProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  onPreviewTransition?: () => void;
}

export function SceneControls({ state, onUpdate, onPreviewTransition }: SceneControlsProps) {
  const activeId = state.activeSceneId ?? state.scenes?.[0]?.id;
  const active = (state.scenes ?? []).find((s) => s.id === activeId);

  if (!active) return null;

  function patchScene(p: Partial<BannerScene>) {
    onUpdate(updateScene(state, active!.id, p));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/60 px-3 py-2">
      <button
        type="button"
        onClick={() => onUpdate(addScene(state))}
        className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-800"
      >
        + Scéna
      </button>
      <button
        type="button"
        onClick={() => onUpdate(duplicateScene(state, active.id))}
        className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800"
      >
        Duplikovat
      </button>
      <button
        type="button"
        disabled={(state.scenes ?? []).length <= 1}
        onClick={() => onUpdate(deleteScene(state, active.id))}
        className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-red-400 hover:bg-zinc-800 disabled:opacity-40"
      >
        Smazat
      </button>
      <button
        type="button"
        onClick={() => onUpdate(moveScene(state, active.id, "left"))}
        className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800"
      >
        ←
      </button>
      <button
        type="button"
        onClick={() => onUpdate(moveScene(state, active.id, "right"))}
        className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800"
      >
        →
      </button>
      <input
        type="text"
        value={active.name}
        onChange={(e) => patchScene({ name: e.target.value })}
        className="w-28 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200"
        aria-label="Název scény"
      />
      <label className="flex items-center gap-1 text-[10px] text-zinc-500">
        Délka
        <input
          type="number"
          min={500}
          max={8000}
          step={100}
          value={active.durationMs}
          onChange={(e) => patchScene({ durationMs: Number(e.target.value) })}
          className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-200"
        />
        ms
      </label>
      <label className="flex items-center gap-1 text-[10px] text-zinc-500">
        Přechod
        <select
          value={active.transitionOut}
          onChange={(e) =>
            patchScene({ transitionOut: e.target.value as BannerSceneTransition })
          }
          className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-200"
        >
          {SCENE_TRANSITIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {transitionFriendlyLabel(t.value)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1 text-[10px] text-zinc-500">
        Přechod ms
        <input
          type="number"
          min={400}
          max={1200}
          step={50}
          value={getSceneTransitionDurationMs(active)}
          onChange={(e) => patchScene({ transitionDurationMs: Number(e.target.value) })}
          className="w-14 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-200"
        />
      </label>
      <button
        type="button"
        onClick={() =>
          onUpdate(
            applyTransitionToAllScenes(state, active.transitionOut, active.transitionDurationMs),
          )
        }
        className="rounded border border-violet-800/50 px-2 py-1 text-[10px] text-violet-300 hover:bg-violet-950/30"
      >
        Přechod na všechny
      </button>
      {onPreviewTransition ? (
        <button
          type="button"
          onClick={onPreviewTransition}
          className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-800"
        >
          Náhled přechodu
        </button>
      ) : null}
    </div>
  );
}
