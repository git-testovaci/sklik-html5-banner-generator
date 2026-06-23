"use client";

import type { BannerScene, BannerSceneTransition } from "@/types/animation";
import { SCENE_TRANSITIONS } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import {
  addScene,
  deleteScene,
  duplicateScene,
  moveScene,
  updateScene,
} from "@/lib/animation/storyboard-utils";

interface SceneControlsProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
}

export function SceneControls({ state, onUpdate }: SceneControlsProps) {
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
        + Add scene
      </button>
      <button
        type="button"
        onClick={() => onUpdate(duplicateScene(state, active.id))}
        className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800"
      >
        Duplicate
      </button>
      <button
        type="button"
        disabled={(state.scenes ?? []).length <= 1}
        onClick={() => onUpdate(deleteScene(state, active.id))}
        className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-red-400 hover:bg-zinc-800 disabled:opacity-40"
      >
        Delete
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
        aria-label="Scene name"
      />
      <label className="flex items-center gap-1 text-[10px] text-zinc-500">
        Duration
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
        Transition
        <select
          value={active.transitionOut}
          onChange={(e) =>
            patchScene({ transitionOut: e.target.value as BannerSceneTransition })
          }
          className="rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-200"
        >
          {SCENE_TRANSITIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
