"use client";

import type { LayerEffect } from "@/types/animation";
import { effectPresetDefaults } from "@/lib/animation/effect-presets";
import { clampTiming } from "@/lib/animation/timeline-utils";
import { getLayerById } from "@/lib/animation/storyboard-utils";

interface KeyframeTrackProps {
  effect: LayerEffect;
  timelineDurationMs: number;
  selected: boolean;
  persistent?: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<LayerEffect>) => void;
}

export function KeyframeTrack({
  effect,
  timelineDurationMs,
  selected,
  persistent,
  onSelect,
  onChange,
}: KeyframeTrackProps) {
  const label = effectPresetDefaults(effect.preset).label;
  const safeDuration = Math.max(timelineDurationMs, 1);
  const leftPct = Math.min(100, Math.max(0, (effect.startMs / safeDuration) * 100));
  const widthPct = Math.min(100, Math.max(0, (effect.durationMs / safeDuration) * 100));

  function onDragStart(clientX: number, mode: "move" | "resize-left" | "resize-right") {
    const startX = clientX;
    const origin = { startMs: effect.startMs, durationMs: effect.durationMs };

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const msPerPx = safeDuration / 400;
      const dMs = Math.round(dx * msPerPx);

      if (mode === "move") {
        const timing = clampTiming(origin.startMs + dMs, origin.durationMs, safeDuration);
        onChange({ startMs: timing.startMs, durationMs: timing.durationMs });
      } else if (mode === "resize-right") {
        const timing = clampTiming(origin.startMs, origin.durationMs + dMs, safeDuration);
        onChange({ startMs: timing.startMs, durationMs: timing.durationMs });
      } else {
        const timing = clampTiming(origin.startMs + dMs, origin.durationMs - dMs, safeDuration);
        onChange({ startMs: timing.startMs, durationMs: timing.durationMs });
      }
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 truncate text-[10px] text-zinc-500">
        {label}
        {persistent ? " 📌" : ""}
      </span>
      <div className="relative h-7 flex-1 rounded bg-zinc-800/50">
        <button
          type="button"
          onClick={onSelect}
          onPointerDown={(e) => {
            e.preventDefault();
            onDragStart(e.clientX, "move");
          }}
          className={`absolute top-0.5 h-6 rounded text-[9px] text-white ${
            selected ? "bg-violet-600 ring-1 ring-violet-400" : "bg-violet-700/80"
          }`}
          style={{
            left: `${leftPct}%`,
            width: `${Math.max(widthPct, 4)}%`,
          }}
        >
          {effect.durationMs}ms
        </button>
        <span
          className="absolute top-0.5 h-6 w-1.5 cursor-ew-resize rounded bg-violet-400/80"
          style={{ left: `calc(${leftPct}% - 3px)` }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(e.clientX, "resize-left");
          }}
        />
        <span
          className="absolute top-0.5 h-6 w-1.5 cursor-ew-resize rounded bg-violet-400/80"
          style={{ left: `calc(${leftPct + widthPct}% - 4px)` }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDragStart(e.clientX, "resize-right");
          }}
        />
      </div>
    </div>
  );
}

export function layerEffectLabel(effect: LayerEffect, state: { bannerLayers?: { id: string; name: string }[] }) {
  const layer = getLayerById(state as Parameters<typeof getLayerById>[0], effect.layerId);
  return `${layer?.name ?? effect.layerId} · ${effectPresetDefaults(effect.preset).label}`;
}
