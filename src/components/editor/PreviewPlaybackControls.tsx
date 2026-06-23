"use client";

interface PreviewPlaybackControlsProps {
  loop: boolean;
  onReplay: () => void;
  onReplayScene?: () => void;
  onPlayAll?: () => void;
  onToggleLoop: (loop: boolean) => void;
  sceneLabel?: string;
}

export function PreviewPlaybackControls({
  loop,
  onReplay,
  onReplayScene,
  onPlayAll,
  onToggleLoop,
  sceneLabel,
}: PreviewPlaybackControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-t border-zinc-800/60 px-4 py-2">
      {onPlayAll ? (
        <button
          type="button"
          onClick={onPlayAll}
          className="rounded-lg border border-violet-700/60 bg-violet-950/40 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-900/40"
        >
          Play all scenes
        </button>
      ) : null}
      <button
        type="button"
        onClick={onReplay}
        className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
      >
        Replay
      </button>
      {onReplayScene ? (
        <button
          type="button"
          onClick={onReplayScene}
          className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Replay scene
        </button>
      ) : null}
      <label className="flex items-center gap-2 text-xs text-zinc-500">
        <input
          type="checkbox"
          checked={loop}
          onChange={(e) => onToggleLoop(e.target.checked)}
          className="rounded border-zinc-600"
        />
        Loop banner
      </label>
      {sceneLabel ? (
        <span className="text-[10px] text-zinc-600">{sceneLabel}</span>
      ) : null}
    </div>
  );
}
