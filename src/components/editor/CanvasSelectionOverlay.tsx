"use client";

interface CanvasSelectionOverlayProps {
  visible: boolean;
  locked?: boolean;
}

export function CanvasSelectionOverlay({ visible, locked = false }: CanvasSelectionOverlayProps) {
  if (!visible) return null;
  return (
    <>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-[5] rounded-sm ${
          locked
            ? "border-2 border-dashed border-amber-400/90 ring-1 ring-amber-400/35"
            : "border-2 border-violet-400 ring-1 ring-violet-400/40"
        }`}
      />
      {locked ? (
        <span
          className="pointer-events-none absolute -top-5 left-0 z-[6] rounded bg-amber-950/90 px-1.5 py-0.5 text-[9px] font-medium text-amber-200"
          title="Vrstva je zamknutá"
        >
          Zamknuto
        </span>
      ) : null}
    </>
  );
}
