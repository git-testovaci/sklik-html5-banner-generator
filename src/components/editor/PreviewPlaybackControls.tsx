"use client";

import type { PlaybackMode } from "@/types/playback";

interface PreviewPlaybackControlsProps {
  mode: PlaybackMode;
  loop: boolean;
  playbackTimeMs: number;
  onPlayAll?: () => void;
  onReplayScene?: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onToggleLoop: (loop: boolean) => void;
  sceneLabel?: string;
}

function formatPausedTime(ms: number): string {
  return `${(ms / 1000).toFixed(2)} s`;
}

export function PreviewPlaybackControls({
  mode,
  loop,
  playbackTimeMs,
  onPlayAll,
  onReplayScene,
  onPause,
  onResume,
  onStop,
  onToggleLoop,
  sceneLabel,
}: PreviewPlaybackControlsProps) {
  const isPlaying = mode === "playing-all" || mode === "playing-scene";
  const isPaused = mode === "paused";
  const isIdle = mode === "idle";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-zinc-800/60 px-4 py-2">
      {isIdle ? (
        <>
          {onPlayAll ? (
            <button
              type="button"
              onClick={onPlayAll}
              className="rounded-lg border border-violet-700/60 bg-violet-950/40 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-900/40"
            >
              Přehrát vše
            </button>
          ) : null}
          {onReplayScene ? (
            <button
              type="button"
              onClick={onReplayScene}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Přehrát scénu
            </button>
          ) : null}
        </>
      ) : null}

      {isPlaying ? (
        <>
          <button
            type="button"
            onClick={onPause}
            className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-900/40"
          >
            Pozastavit
          </button>
          <button
            type="button"
            onClick={onStop}
            className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700/60"
          >
            Zastavit
          </button>
        </>
      ) : null}

      {isPaused ? (
        <>
          <button
            type="button"
            onClick={onResume}
            className="rounded-lg border border-violet-700/60 bg-violet-950/40 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-900/40"
          >
            Pokračovat
          </button>
          <button
            type="button"
            onClick={onStop}
            className="rounded-lg border border-zinc-600 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700/60"
          >
            Zastavit
          </button>
          <span className="text-[10px] text-zinc-500">
            Pozastaveno · {formatPausedTime(playbackTimeMs)}
          </span>
        </>
      ) : null}

      {isIdle ? (
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={loop}
            onChange={(e) => onToggleLoop(e.target.checked)}
            className="rounded border-zinc-600"
          />
          Opakovat
        </label>
      ) : null}

      {sceneLabel ? (
        <span className="text-[10px] text-zinc-600">{sceneLabel}</span>
      ) : null}
    </div>
  );
}
