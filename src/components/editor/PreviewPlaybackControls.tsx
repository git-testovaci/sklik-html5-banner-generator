"use client";

interface PreviewPlaybackControlsProps {
  loop: boolean;
  onReplay: () => void;
  onToggleLoop: (loop: boolean) => void;
}

export function PreviewPlaybackControls({
  loop,
  onReplay,
  onToggleLoop,
}: PreviewPlaybackControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-t border-zinc-800/60 px-4 py-2">
      <button
        type="button"
        onClick={onReplay}
        className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
      >
        Replay animation
      </button>
      <label className="flex items-center gap-2 text-xs text-zinc-500">
        <input
          type="checkbox"
          checked={loop}
          onChange={(e) => onToggleLoop(e.target.checked)}
          className="rounded border-zinc-600"
        />
        Loop in preview
      </label>
    </div>
  );
}
