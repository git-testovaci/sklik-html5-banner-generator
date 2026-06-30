"use client";

import type { BannerScene, BannerSceneTransition } from "@/types/animation";
import { SCENE_TRANSITIONS } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import { transitionTargetScene } from "@/lib/animation/global-timeline-utils";
import { transitionFriendlyLabel } from "@/lib/animation/effect-labels";
import {
  applyTransitionToAllScenes,
  EDITOR_MAX_SCENE_TRANSITION_MS,
  getSceneTransitionDurationMs,
  MIN_SCENE_TRANSITION_MS,
  patchSceneTransition,
} from "@/lib/animation/storyboard-utils";

interface TransitionInspectorControlsProps {
  state: BannerEditorState;
  scene: BannerScene;
  onUpdate: BannerEditorStateUpdater;
  onPreviewTransition?: () => void;
}

function transitionOptionLabel(value: BannerSceneTransition): string {
  if (value === "none") return "Žádný";
  return transitionFriendlyLabel(value);
}

function transitionSubtitle(scene: BannerScene, target: BannerScene | undefined): string {
  if (target) return `${scene.name} → ${target.name}`;
  return scene.name;
}

export function TransitionInspectorControls({
  state,
  scene,
  onUpdate,
  onPreviewTransition,
}: TransitionInspectorControlsProps) {
  const target = transitionTargetScene(state, scene.id);
  const durationMs = getSceneTransitionDurationMs(scene);
  const hasTransition = scene.transitionOut !== "none";

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Přechod</h2>
        <p className="text-xs text-zinc-500">{transitionSubtitle(scene, target)}</p>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs leading-relaxed text-zinc-500">
          Přechod se použije mezi scénami na časové ose.
        </p>

        {onPreviewTransition ? (
          <button
            type="button"
            onClick={onPreviewTransition}
            className="rounded border border-violet-800/50 bg-violet-950/20 px-2.5 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-950/40"
          >
            Náhled přechodu
          </button>
        ) : null}

        <label className="block text-xs text-zinc-500">
          Typ přechodu
          <select
            value={scene.transitionOut}
            onChange={(e) =>
              onUpdate(
                (prev) =>
                  patchSceneTransition(prev, scene.id, {
                    transitionOut: e.target.value as BannerSceneTransition,
                  }),
                { history: "push" },
              )
            }
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
          >
            {SCENE_TRANSITIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {transitionOptionLabel(t.value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-zinc-500">
          Délka přechodu (ms)
          <input
            type="number"
            min={hasTransition ? MIN_SCENE_TRANSITION_MS : 0}
            max={EDITOR_MAX_SCENE_TRANSITION_MS}
            step={50}
            disabled={!hasTransition}
            value={durationMs}
            onChange={(e) =>
              onUpdate(
                (prev) =>
                  patchSceneTransition(prev, scene.id, {
                    transitionDurationMs: Number(e.target.value),
                  }),
                { history: "push" },
              )
            }
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm disabled:opacity-50"
          />
        </label>

        <button
          type="button"
          onClick={() =>
            onUpdate(
              (prev) =>
                patchSceneTransition(prev, scene.id, {
                  transitionOut: "none",
                  transitionDurationMs: 0,
                }),
              { history: "push" },
            )
          }
          className="rounded border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/50"
        >
          Bez přechodu
        </button>

        <details className="border-t border-zinc-800/60 pt-3">
          <summary className="cursor-pointer text-xs text-zinc-500">Více nastavení</summary>
          <div className="mt-3">
            <button
              type="button"
              onClick={() =>
                onUpdate(
                  (prev) =>
                    applyTransitionToAllScenes(
                      prev,
                      scene.transitionOut,
                      scene.transitionDurationMs,
                    ),
                  { history: "push" },
                )
              }
              className="rounded border border-violet-800/50 bg-violet-950/20 px-2.5 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-950/40"
            >
              Použít přechod na všechny scény
            </button>
          </div>
        </details>
      </div>
    </section>
  );
}
