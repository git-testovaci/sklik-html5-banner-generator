"use client";

import { useMemo } from "react";
import {
  getActiveScene,
  getEffectsForScene,
  getSceneById,
  totalStoryboardDurationMs,
} from "@/lib/animation/storyboard-utils";
import { effectPresetDefaults } from "@/lib/animation/effect-presets";
import type { BannerEditorState } from "@/types/editor";

interface PlaybackTimelineProps {
  state: BannerEditorState;
  playAll: boolean;
  playbackTimeMs: number;
  playbackSceneId: string | null;
  replaySceneMode?: boolean;
}

function formatTime(ms: number): string {
  const s = ms / 1000;
  return s >= 10 ? `${s.toFixed(1)}s` : `${(ms / 1000).toFixed(2)}s`;
}

export function PlaybackTimeline({
  state,
  playAll,
  playbackTimeMs,
  playbackSceneId,
  replaySceneMode = false,
}: PlaybackTimelineProps) {
  const scenes = useMemo(() => state.scenes ?? [], [state.scenes]);
  const totalMs = totalStoryboardDurationMs(state);
  const activeScene = getActiveScene(state);
  const displaySceneId = playbackSceneId ?? activeScene?.id;
  const displayScene = displaySceneId ? getSceneById(state, displaySceneId) : activeScene;

  const sceneDuration = replaySceneMode
    ? (displayScene?.durationMs ?? state.timeline?.durationMs ?? 3000)
    : totalMs;

  const clampedTime = Math.max(0, Math.min(playbackTimeMs, sceneDuration));
  const progressPct = sceneDuration > 0 ? (clampedTime / sceneDuration) * 100 : 0;

  const sceneSegments = useMemo(() => {
    if (scenes.length <= 1) return [];
    let offset = 0;
    return scenes.map((scene) => {
      const start = offset;
      offset += scene.durationMs;
      return {
        scene,
        startMs: start,
        widthPct: totalMs > 0 ? (scene.durationMs / totalMs) * 100 : 0,
        leftPct: totalMs > 0 ? (start / totalMs) * 100 : 0,
      };
    });
  }, [scenes, totalMs]);

  const sceneEffects = displayScene
    ? getEffectsForScene(state, displayScene.id)
    : [];

  if (scenes.length <= 1 && !playAll && !replaySceneMode) {
    return null;
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-medium text-zinc-300">Playback timeline</h3>
          <p className="text-[10px] text-zinc-500">
            {playAll
              ? "Playing all scenes"
              : replaySceneMode
                ? "Replaying current scene"
                : "Ready"}
            {displayScene ? ` · ${displayScene.name}` : ""}
          </p>
        </div>
        <p className="font-mono text-xs text-violet-300">
          {formatTime(clampedTime)} / {formatTime(sceneDuration)}
        </p>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-zinc-800/80">
        {playAll && sceneSegments.length > 1
          ? sceneSegments.map(({ scene, widthPct, leftPct }) => (
              <div
                key={scene.id}
                className={`absolute top-0 h-full border-r border-zinc-900/40 ${
                  scene.id === displaySceneId ? "bg-violet-900/50" : "bg-zinc-700/40"
                }`}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                title={scene.name}
              />
            ))
          : null}
        <div
          className="absolute top-0 h-full w-0.5 bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]"
          style={{ left: `${Math.min(100, progressPct)}%` }}
          aria-hidden
        />
      </div>

      {playAll && sceneSegments.length > 1 ? (
        <div className="mt-1 flex gap-0.5">
          {sceneSegments.map(({ scene, widthPct }) => (
            <span
              key={scene.id}
              className="truncate text-[9px] text-zinc-600"
              style={{ width: `${widthPct}%` }}
            >
              {scene.name}
            </span>
          ))}
        </div>
      ) : null}

      {sceneEffects.length > 0 && displayScene ? (
        <div className="mt-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">
            Effects · {displayScene.name}
          </p>
          <div className="relative h-6 rounded bg-zinc-800/50">
            {sceneEffects.map((effect) => {
              const dur = displayScene.durationMs;
              const left = dur > 0 ? (effect.startMs / dur) * 100 : 0;
              const width = dur > 0 ? (effect.durationMs / dur) * 100 : 0;
              const label = effectPresetDefaults(effect.preset).label;
              return (
                <div
                  key={effect.id}
                  className="absolute top-0.5 h-5 rounded bg-violet-700/70 px-1 text-[8px] leading-5 text-white"
                  style={{
                    left: `${left}%`,
                    width: `${Math.max(width, 6)}%`,
                  }}
                  title={label}
                >
                  {label}
                </div>
              );
            })}
            {replaySceneMode || playAll ? (
              <div
                className="absolute top-0 h-full w-px bg-violet-300/80"
                style={{
                  left: `${displayScene.durationMs > 0 ? (clampedTime / displayScene.durationMs) * 100 : 0}%`,
                }}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
