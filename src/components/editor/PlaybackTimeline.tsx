"use client";

import { useMemo } from "react";
import {
  getActiveScene,
  getEffectsForScene,
  getSceneById,
  totalStoryboardDurationMs,
} from "@/lib/animation/storyboard-utils";
import {
  describeLayerEffect,
  findActiveEffectAtTime,
  transitionFriendlyLabel,
} from "@/lib/animation/effect-labels";
import { sceneTransitionWindowMs } from "@/lib/animation/scene-sequence-css";
import type { PlaybackMode } from "@/types/playback";
import type { BannerEditorState } from "@/types/editor";

interface PlaybackTimelineProps {
  state: BannerEditorState;
  mode: PlaybackMode;
  playAllView: boolean;
  playbackTimeMs: number;
  playbackSceneId: string | null;
}

function formatTime(ms: number): string {
  const s = ms / 1000;
  return s >= 10 ? `${s.toFixed(1)}s` : `${(ms / 1000).toFixed(2)}s`;
}

function sceneLocalTime(
  globalMs: number,
  scenes: { id: string; durationMs: number }[],
  sceneId: string,
): number {
  let offset = 0;
  for (const scene of scenes) {
    if (scene.id === sceneId) return Math.max(0, globalMs - offset);
    offset += scene.durationMs;
  }
  return 0;
}

export function PlaybackTimeline({
  state,
  mode,
  playAllView,
  playbackTimeMs,
  playbackSceneId,
}: PlaybackTimelineProps) {
  const scenes = useMemo(() => state.scenes ?? [], [state.scenes]);
  const totalMs = totalStoryboardDurationMs(state);
  const activeScene = getActiveScene(state);
  const displaySceneId = playbackSceneId ?? activeScene?.id;
  const displayScene = displaySceneId ? getSceneById(state, displaySceneId) : activeScene;

  const replaySceneView =
    mode === "playing-scene" || (mode === "paused" && !playAllView);

  const sceneDuration = playAllView
    ? totalMs
    : displayScene?.durationMs ?? state.timeline?.durationMs ?? 3000;

  const clampedTime = Math.max(0, Math.min(playbackTimeMs, sceneDuration));
  const progressPct = sceneDuration > 0 ? (clampedTime / sceneDuration) * 100 : 0;

  const sceneSegments = useMemo(() => {
    if (scenes.length <= 1) return [];
    let offset = 0;
    return scenes.map((scene, index) => {
      const start = offset;
      offset += scene.durationMs;
      const transMs = sceneTransitionWindowMs(scene.durationMs);
      return {
        scene,
        startMs: start,
        widthPct: totalMs > 0 ? (scene.durationMs / totalMs) * 100 : 0,
        leftPct: totalMs > 0 ? (start / totalMs) * 100 : 0,
        transitionPct:
          totalMs > 0 && index < scenes.length - 1
            ? (transMs / totalMs) * 100
            : 0,
        transitionOut: scene.transitionOut,
      };
    });
  }, [scenes, totalMs]);

  const sceneEffects = displayScene ? getEffectsForScene(state, displayScene.id) : [];
  const localTime = displayScene
    ? playAllView
      ? sceneLocalTime(clampedTime, scenes, displayScene.id)
      : clampedTime
    : 0;
  const activeEffect = findActiveEffectAtTime(sceneEffects, localTime);

  const statusLabel =
    mode === "playing-all"
      ? "Přehrávání všech scén"
      : mode === "playing-scene"
        ? "Přehrávání scény"
        : mode === "paused"
          ? "Pozastaveno"
          : "Připraveno";

  const nowLabel = activeEffect
    ? `Teď běží: ${describeLayerEffect(state, activeEffect)}`
    : displayScene
      ? "Scéna se zobrazuje"
      : "";

  if (scenes.length <= 1 && mode === "idle") {
    return null;
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-medium text-zinc-300">Časová osa přehrávání</h3>
          <p className="text-[10px] text-zinc-500">
            {statusLabel}
            {displayScene ? ` · ${displayScene.name}` : ""}
          </p>
        </div>
        <p className="font-mono text-xs text-violet-300">
          {formatTime(clampedTime)} / {formatTime(sceneDuration)}
        </p>
      </div>

      {nowLabel && mode !== "idle" ? (
        <p className="mb-2 text-[11px] text-violet-200/90">{nowLabel}</p>
      ) : null}

      <div className="relative h-3 overflow-hidden rounded-full bg-zinc-800/80">
        {playAllView && sceneSegments.length > 1
          ? sceneSegments.map(({ scene, widthPct, leftPct, transitionPct, transitionOut }) => (
              <div
                key={scene.id}
                className={`absolute top-0 h-full border-r border-zinc-900/50 ${
                  scene.id === displaySceneId ? "bg-violet-900/55" : "bg-zinc-700/35"
                }`}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                title={scene.name}
              >
                {transitionPct > 0 && transitionOut !== "none" ? (
                  <div
                    className="absolute right-0 top-0 h-full bg-amber-500/25"
                    style={{ width: `${Math.min(transitionPct / widthPct * 100, 35)}%` }}
                    title={transitionFriendlyLabel(transitionOut)}
                  />
                ) : null}
              </div>
            ))
          : null}
        <div
          className="absolute top-0 z-10 h-full w-0.5 bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.9)]"
          style={{ left: `${Math.min(100, progressPct)}%` }}
          aria-hidden
        />
      </div>

      {playAllView && sceneSegments.length > 1 ? (
        <div className="mt-1 flex gap-0.5">
          {sceneSegments.map(({ scene, widthPct }) => (
            <span
              key={scene.id}
              className={`truncate text-[9px] ${
                scene.id === displaySceneId ? "text-violet-300" : "text-zinc-600"
              }`}
              style={{ width: `${widthPct}%` }}
            >
              {scene.name}
            </span>
          ))}
        </div>
      ) : null}

      {(replaySceneView || playAllView) && sceneEffects.length > 0 && displayScene ? (
        <div className="mt-3 space-y-1">
          <p className="text-[10px] text-zinc-500">Animace ve scéně · {displayScene.name}</p>
          <ul className="space-y-0.5">
            {sceneEffects.map((effect) => {
              const isActive =
                localTime >= effect.startMs &&
                localTime < effect.startMs + effect.durationMs;
              const dur = displayScene.durationMs;
              const left = dur > 0 ? (effect.startMs / dur) * 100 : 0;
              const width = dur > 0 ? (effect.durationMs / dur) * 100 : 0;
              return (
                <li key={effect.id} className="relative h-5 rounded bg-zinc-800/50">
                  <div
                    className={`absolute top-0.5 h-4 rounded px-1 text-[8px] leading-4 ${
                      isActive ? "bg-violet-500 text-white" : "bg-violet-800/60 text-violet-100"
                    }`}
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 8)}%`,
                    }}
                    title={describeLayerEffect(state, effect)}
                  >
                    <span className="block truncate">{describeLayerEffect(state, effect)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
