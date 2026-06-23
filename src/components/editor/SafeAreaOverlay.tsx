"use client";

import { safeInset } from "@/lib/animation/timeline-utils";

interface SafeAreaOverlayProps {
  width: number;
  height: number;
  visible: boolean;
}

export function SafeAreaOverlay({ width, height, visible }: SafeAreaOverlayProps) {
  if (!visible) return null;

  const inset = safeInset(width, height);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-50"
      aria-hidden="true"
    >
      <div
        className="absolute border border-dashed border-sky-400/50"
        style={{
          left: inset,
          top: inset,
          width: width - inset * 2,
          height: height - inset * 2,
        }}
      />
      <div
        className="absolute bg-sky-400/20"
        style={{ left: width / 2 - 0.5, top: inset, width: 1, height: height - inset * 2 }}
      />
      <div
        className="absolute bg-sky-400/20"
        style={{ left: inset, top: height / 2 - 0.5, width: width - inset * 2, height: 1 }}
      />
    </div>
  );
}
