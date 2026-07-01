"use client";

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}

interface ClassicCanvasToolbarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitToView: () => void;
}

export function ClassicCanvasToolbar({
  zoom,
  onZoomChange,
  onFitToView,
}: ClassicCanvasToolbarProps) {
  const percent = Math.round(zoom * 100);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-900/60 px-3 py-2">
      <button
        type="button"
        aria-label="Oddálit"
        onClick={() => onZoomChange(clampZoom(zoom - ZOOM_STEP))}
        className="inline-flex h-8 w-8 items-center justify-center rounded border border-zinc-700 text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
      >
        −
      </button>
      <span className="min-w-[3.5rem] text-center font-mono text-xs text-zinc-400">{percent}%</span>
      <button
        type="button"
        aria-label="Přiblížit"
        onClick={() => onZoomChange(clampZoom(zoom + ZOOM_STEP))}
        className="inline-flex h-8 w-8 items-center justify-center rounded border border-zinc-700 text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => onZoomChange(1)}
        className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
      >
        100%
      </button>
      <button
        type="button"
        onClick={onFitToView}
        className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
      >
        Vejít do náhledu
      </button>
    </div>
  );
}

export { ZOOM_MIN, ZOOM_MAX, clampZoom };
