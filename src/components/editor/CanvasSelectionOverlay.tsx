"use client";

interface CanvasSelectionOverlayProps {
  visible: boolean;
}

export function CanvasSelectionOverlay({ visible }: CanvasSelectionOverlayProps) {
  if (!visible) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5] rounded-sm border-2 border-violet-400 ring-1 ring-violet-400/40"
    />
  );
}
