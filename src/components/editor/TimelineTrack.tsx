"use client";

import { useCallback, useRef } from "react";
import { ANIMATION_PRESETS, presetDefaultEnterFrom } from "@/types/animation";
import type { LayerAnimation } from "@/types/animation";
import { clampTiming } from "@/lib/animation/timeline-utils";
import { AnimationControls } from "./AnimationControls";

interface TimelineTrackProps {
  animation: LayerAnimation;
  timelineDurationMs: number;
  selected: boolean;
  onChange: (patch: Partial<LayerAnimation>) => void;
}

type DragMode = "move" | "resize-left" | "resize-right";

export function TimelineTrack({
  animation,
  timelineDurationMs,
  selected,
  onChange,
}: TimelineTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const timing = clampTiming(animation.startMs, animation.durationMs, timelineDurationMs);
  const leftPct = (timing.startMs / timelineDurationMs) * 100;
  const widthPct = (timing.durationMs / timelineDurationMs) * 100;
  const outOfRange = timing.startMs + timing.durationMs > timelineDurationMs;
  const tooShort = timing.durationMs < 150;

  const applyTiming = useCallback(
    (startMs: number, durationMs: number) => {
      const next = clampTiming(startMs, durationMs, timelineDurationMs);
      onChange({ startMs: next.startMs, durationMs: next.durationMs });
    },
    [onChange, timelineDurationMs],
  );

  const startPointerDrag = useCallback(
    (e: React.PointerEvent, mode: DragMode) => {
      e.preventDefault();
      e.stopPropagation();
      const track = trackRef.current;
      if (!track || track.clientWidth <= 0) return;

      const trackWidth = track.clientWidth;
      const originStart = timing.startMs;
      const originDuration = timing.durationMs;
      const startX = e.clientX;

      function onMove(ev: PointerEvent) {
        const dx = ev.clientX - startX;
        const dMs = Math.round((dx / trackWidth) * timelineDurationMs);

        if (mode === "move") {
          applyTiming(originStart + dMs, originDuration);
        } else if (mode === "resize-left") {
          const newStart = originStart + dMs;
          const newDuration = originDuration - dMs;
          applyTiming(newStart, newDuration);
        } else {
          applyTiming(originStart, originDuration + dMs);
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
    },
    [applyTiming, timing.durationMs, timing.startMs, timelineDurationMs],
  );

  function handlePresetChange(preset: LayerAnimation["preset"]) {
    onChange({
      preset,
      enterFrom: presetDefaultEnterFrom(preset),
    });
  }

  return (
    <div
      className={`rounded-lg border p-2 ${
        selected
          ? "border-violet-700/60 bg-violet-950/20"
          : "border-zinc-800/60 bg-zinc-950/40"
      } ${!animation.enabled ? "opacity-60" : ""}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={animation.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            className="rounded border-zinc-600"
          />
          <span className="capitalize">{animation.layerType}</span>
        </label>
        <select
          value={animation.preset}
          onChange={(e) => handlePresetChange(e.target.value as LayerAnimation["preset"])}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-100"
        >
          {ANIMATION_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <span className="font-mono text-[10px] text-zinc-500">
          {timing.startMs}ms · {timing.durationMs}ms
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative mb-2 h-6 touch-none rounded bg-zinc-800/80"
        title="Drag bar to move · drag edges to resize"
      >
        {animation.enabled && animation.preset !== "none" ? (
          <div
            className="absolute top-1 flex h-4 cursor-grab items-stretch rounded bg-violet-600/80 active:cursor-grabbing"
            style={{
              left: `${leftPct}%`,
              width: `${Math.max(widthPct, 1.5)}%`,
            }}
            onPointerDown={(e) => startPointerDrag(e, "move")}
          >
            <span
              className="w-1.5 shrink-0 cursor-ew-resize rounded-l bg-violet-400/80"
              onPointerDown={(e) => startPointerDrag(e, "resize-left")}
            />
            <span className="flex-1" />
            <span
              className="w-1.5 shrink-0 cursor-ew-resize rounded-r bg-violet-400/80"
              onPointerDown={(e) => startPointerDrag(e, "resize-right")}
            />
          </div>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-600">
            No animation
          </span>
        )}
      </div>

      {(outOfRange || tooShort) && animation.enabled ? (
        <p className="mb-2 text-[10px] text-amber-400">
          {tooShort ? "Duration is very short." : "Clip exceeds timeline length."}
        </p>
      ) : null}

      {selected ? (
        <AnimationControls
          animation={animation}
          timelineDurationMs={timelineDurationMs}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}
