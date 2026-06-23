"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatTimelineSeconds,
  getLayerTimelineRange,
  getTimelineLayersForScene,
  isTimelineLayerSelected,
  layerTimelineBlockColor,
  layerTimelineLabel,
  selectionForBannerLayer,
} from "@/lib/animation/layer-timeline-utils";
import {
  getLayerPhaseSegments,
  phaseSegmentTooltip,
} from "@/lib/animation/layer-phase-utils";
import { getActiveScene } from "@/lib/animation/storyboard-utils";
import type { BannerEditorState, SelectedLayer } from "@/types/editor";

const LABEL_WIDTH = 128;
const RULER_HEIGHT = 28;
const ROW_HEIGHT = 34;

interface UnifiedLayerTimelineProps {
  state: BannerEditorState;
  selectedLayer: SelectedLayer;
  onSelectLayer: (layer: SelectedLayer) => void;
  playheadMs: number;
  isPlaying: boolean;
  onScrub: (timeMs: number) => void;
  onRangeChange: (layerId: string, startMs: number, durationMs: number) => void;
  onPhaseDurationChange?: (
    layerId: string,
    phase: "in" | "out",
    durationMs: number,
  ) => void;
}

type DragMode = "move" | "resize-left" | "resize-right" | "phase-in" | "phase-out";

interface DragState {
  layerId: string;
  mode: DragMode;
  startX: number;
  initialStartMs: number;
  initialDurationMs: number;
  initialPhaseInMs: number;
  initialPhaseOutMs: number;
  trackWidth: number;
}

function msFromClientX(
  clientX: number,
  rect: DOMRect,
  sceneDurationMs: number,
): number {
  const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return pct * sceneDurationMs;
}

function buildRulerTicks(sceneDurationMs: number): number[] {
  const step =
    sceneDurationMs <= 3000
      ? 500
      : sceneDurationMs <= 6000
        ? 1000
        : sceneDurationMs <= 15000
          ? 2000
          : 5000;
  const ticks: number[] = [];
  for (let t = 0; t <= sceneDurationMs; t += step) {
    ticks.push(t);
  }
  if (ticks[ticks.length - 1] !== sceneDurationMs) {
    ticks.push(sceneDurationMs);
  }
  return ticks;
}

export function UnifiedLayerTimeline({
  state,
  selectedLayer,
  onSelectLayer,
  playheadMs,
  isPlaying,
  onScrub,
  onRangeChange,
  onPhaseDurationChange,
}: UnifiedLayerTimelineProps) {
  const scene = getActiveScene(state);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const liveRangeRef = useRef<{ layerId: string; startMs: number; durationMs: number } | null>(
    null,
  );
  const [livePhase, setLivePhase] = useState<{
    layerId: string;
    inMs: number;
    outMs: number;
  } | null>(null);
  const livePhaseRef = useRef<{ layerId: string; inMs: number; outMs: number } | null>(
    null,
  );

  const [liveRange, setLiveRange] = useState<{
    layerId: string;
    startMs: number;
    durationMs: number;
  } | null>(null);

  const sceneDurationMs = scene?.durationMs ?? 3000;
  const layers = scene ? getTimelineLayersForScene(state, scene.id) : [];
  const ticks = buildRulerTicks(sceneDurationMs);
  const playheadPct =
    sceneDurationMs > 0 ? (playheadMs / sceneDurationMs) * 100 : 0;

  const getRange = (layerId: string) => {
    if (liveRange?.layerId === layerId) {
      return { startMs: liveRange.startMs, durationMs: liveRange.durationMs };
    }
    if (!scene) return { startMs: 0, durationMs: sceneDurationMs };
    return getLayerTimelineRange(state, scene.id, layerId);
  };

  const finishDrag = useCallback(
    (drag: DragState, startMs: number, durationMs: number) => {
      onRangeChange(drag.layerId, startMs, durationMs);
      liveRangeRef.current = null;
      setLiveRange(null);
      dragRef.current = null;
    },
    [onRangeChange],
  );

  const finishPhaseDrag = useCallback(
    (drag: DragState) => {
      const phase = livePhaseRef.current;
      if (phase && phase.layerId === drag.layerId && onPhaseDurationChange) {
        if (drag.mode === "phase-in") {
          onPhaseDurationChange(drag.layerId, "in", phase.inMs);
        } else if (drag.mode === "phase-out") {
          onPhaseDurationChange(drag.layerId, "out", phase.outMs);
        }
      }
      livePhaseRef.current = null;
      setLivePhase(null);
      dragRef.current = null;
    },
    [onPhaseDurationChange],
  );

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      const sceneDur = scene?.durationMs ?? 3000;
      if (!drag || !scene) return;

      const dx = e.clientX - drag.startX;
      const dMs = (dx / drag.trackWidth) * sceneDur;

      if (drag.mode === "phase-in" || drag.mode === "phase-out") {
        const blockDur = drag.initialDurationMs;
        const dBlockMs = (dx / drag.trackWidth) * sceneDur;
        let inMs = drag.initialPhaseInMs;
        let outMs = drag.initialPhaseOutMs;
        if (drag.mode === "phase-in") {
          inMs = Math.max(
            0,
            Math.min(
              drag.initialPhaseInMs + dBlockMs,
              blockDur - outMs - 100,
            ),
          );
          if (inMs > 0 && inMs < 100) inMs = 100;
        } else {
          outMs = Math.max(
            0,
            Math.min(
              drag.initialPhaseOutMs - dBlockMs,
              blockDur - inMs - 100,
            ),
          );
          if (outMs > 0 && outMs < 100) outMs = 100;
        }
        const next = { layerId: drag.layerId, inMs, outMs };
        livePhaseRef.current = next;
        setLivePhase(next);
        return;
      }

      let start = drag.initialStartMs;
      let dur = drag.initialDurationMs;

      if (drag.mode === "move") {
        start = Math.max(0, Math.min(drag.initialStartMs + dMs, sceneDur - dur));
      } else if (drag.mode === "resize-left") {
        const end = drag.initialStartMs + drag.initialDurationMs;
        start = Math.max(0, Math.min(drag.initialStartMs + dMs, end - 100));
        dur = end - start;
      } else {
        dur = Math.max(
          100,
          Math.min(drag.initialDurationMs + dMs, sceneDur - drag.initialStartMs),
        );
      }

      const next = { layerId: drag.layerId, startMs: start, durationMs: dur };
      liveRangeRef.current = next;
      setLiveRange(next);
    }

    function onUp() {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.mode === "phase-in" || drag.mode === "phase-out") {
        finishPhaseDrag(drag);
        return;
      }
      const range = liveRangeRef.current;
      if (range && range.layerId === drag.layerId) {
        finishDrag(drag, range.startMs, range.durationMs);
      } else {
        finishDrag(drag, drag.initialStartMs, drag.initialDurationMs);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [finishDrag, finishPhaseDrag, scene]);

  function startBlockDrag(
    e: React.PointerEvent,
    layerId: string,
    mode: DragMode,
  ) {
    e.preventDefault();
    e.stopPropagation();
    const track = trackRef.current;
    if (!track || !scene) return;
    const range = getLayerTimelineRange(state, scene.id, layerId);
    const segments = getLayerPhaseSegments(state, scene.id, layerId);
    dragRef.current = {
      layerId,
      mode,
      startX: e.clientX,
      initialStartMs: range.startMs,
      initialDurationMs: range.durationMs,
      initialPhaseInMs: segments.inDurationMs,
      initialPhaseOutMs: segments.outDurationMs,
      trackWidth: track.getBoundingClientRect().width,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function getPhaseSegments(layerId: string) {
    if (!scene) return getLayerPhaseSegments(state, "", layerId);
    const base = getLayerPhaseSegments(state, scene.id, layerId);
    if (livePhase?.layerId === layerId) {
      return {
        ...base,
        inDurationMs: livePhase.inMs,
        outDurationMs: livePhase.outMs,
        staticMs: Math.max(100, base.rangeDurationMs - livePhase.inMs - livePhase.outMs),
      };
    }
    return base;
  }

  function handleTrackScrub(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current) return;
    if (isPlaying) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    onScrub(msFromClientX(e.clientX, rect, sceneDurationMs));
  }

  if (!scene) {
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-6 text-center">
        <p className="text-xs text-zinc-500">Scéna není k dispozici.</p>
      </section>
    );
  }

  return (
    <section
      id="unified-layer-timeline"
      className="rounded-xl border border-zinc-800/80 bg-zinc-950/60"
    >
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Časová osa vrstev</h2>
          <p className="text-[10px] text-zinc-500">
            {scene.name} · {formatTimelineSeconds(sceneDurationMs)}
            {isPlaying ? " · přehrávání" : " · tažením posunete blok"}
          </p>
        </div>
        <p className="font-mono text-xs text-violet-300">
          {formatTimelineSeconds(playheadMs)}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          {/* Ruler row */}
          <div className="flex border-b border-zinc-800/50" style={{ height: RULER_HEIGHT }}>
            <div
              className="shrink-0 border-r border-zinc-800/50 bg-zinc-900/50"
              style={{ width: LABEL_WIDTH }}
            />
            <div
              ref={trackRef}
              className="relative flex-1 cursor-crosshair bg-zinc-900/30"
              onPointerDown={handleTrackScrub}
            >
              {ticks.map((t) => {
                const left = sceneDurationMs > 0 ? (t / sceneDurationMs) * 100 : 0;
                return (
                  <div
                    key={t}
                    className="pointer-events-none absolute top-0 h-full border-l border-zinc-700/40"
                    style={{ left: `${left}%` }}
                  >
                    <span className="absolute left-0.5 top-0.5 text-[9px] text-zinc-600">
                      {(t / 1000).toFixed(t >= 10000 ? 0 : 1)}s
                    </span>
                  </div>
                );
              })}
              <div
                className="pointer-events-none absolute top-0 z-20 h-full w-0.5 bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.85)]"
                style={{ left: `${Math.min(100, playheadPct)}%` }}
              />
            </div>
          </div>

          {/* Layer rows — one track per layer (future CapCut unified model) */}
          {layers.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-zinc-500">
              Ve scéně zatím nejsou vrstvy.
            </p>
          ) : (
            layers.map((layer) => {
              const range = getRange(layer.id);
              const leftPct =
                sceneDurationMs > 0 ? (range.startMs / sceneDurationMs) * 100 : 0;
              const widthPct =
                sceneDurationMs > 0 ? (range.durationMs / sceneDurationMs) * 100 : 100;
              const selected = isTimelineLayerSelected(selectedLayer, layer);
              const blockColor = layerTimelineBlockColor(layer);
              const segments = getPhaseSegments(layer.id);
              const blockDur = range.durationMs;
              const inPct = blockDur > 0 ? (segments.inDurationMs / blockDur) * 100 : 0;
              const outPct = blockDur > 0 ? (segments.outDurationMs / blockDur) * 100 : 0;
              const midPct = Math.max(0, 100 - inPct - outPct);

              return (
                <div
                  key={layer.id}
                  className={`flex border-b border-zinc-800/30 ${
                    selected ? "bg-violet-950/20" : ""
                  } ${!layer.visible ? "opacity-45" : ""}`}
                  style={{ height: ROW_HEIGHT }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectLayer(selectionForBannerLayer(layer))}
                    className={`shrink-0 truncate border-r border-zinc-800/50 px-2 text-left text-[11px] ${
                      selected
                        ? "bg-violet-950/40 text-violet-200"
                        : "bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800/40"
                    }`}
                    style={{ width: LABEL_WIDTH }}
                    title={layerTimelineLabel(layer)}
                  >
                    {layerTimelineLabel(layer)}
                    {!layer.visible ? " (skryté)" : ""}
                  </button>

                  <div
                    className="relative flex-1 bg-zinc-900/20"
                    onPointerDown={handleTrackScrub}
                  >
                    <div
                      className={`absolute top-1 flex h-[calc(100%-8px)] min-w-[12px] cursor-grab items-center rounded border active:cursor-grabbing ${blockColor} ${
                        selected ? "ring-1 ring-violet-300/80" : ""
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 1.5)}%`,
                      }}
                      onPointerDown={(e) => startBlockDrag(e, layer.id, "move")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLayer(selectionForBannerLayer(layer));
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize rounded-l bg-white/20 hover:bg-white/40"
                        onPointerDown={(e) => startBlockDrag(e, layer.id, "resize-left")}
                      />
                      {/* In / loop / out segments inside layer block */}
                      {segments.in.active && inPct > 0 ? (
                        <div
                          className="pointer-events-none absolute left-0 top-0 h-full border-r border-white/25 bg-gradient-to-r from-white/25 to-transparent"
                          style={{ width: `${inPct}%` }}
                          title={phaseSegmentTooltip(segments.in, "in")}
                        >
                          {inPct > 14 ? (
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-white/90">
                              In {(segments.inDurationMs / 1000).toFixed(1)}s
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {midPct > 0 ? (
                        <div
                          className="pointer-events-none absolute top-0 h-full"
                          style={{ left: `${inPct}%`, width: `${midPct}%` }}
                          title={
                            segments.loopActive
                              ? phaseSegmentTooltip(segments.loop, "loop")
                              : "Zobrazení vrstvy"
                          }
                        >
                          {segments.loopActive && midPct > 18 ? (
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/75">
                              ⟳ {segments.loop.label}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {segments.out.active && outPct > 0 ? (
                        <div
                          className="pointer-events-none absolute right-0 top-0 h-full border-l border-white/25 bg-gradient-to-l from-white/25 to-transparent"
                          style={{ width: `${outPct}%` }}
                          title={phaseSegmentTooltip(segments.out, "out")}
                        >
                          {outPct > 14 ? (
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-white/90">
                              Out {(segments.outDurationMs / 1000).toFixed(1)}s
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {segments.in.active && onPhaseDurationChange ? (
                        <div
                          className="absolute top-0 z-10 h-full w-1 cursor-ew-resize bg-emerald-300/80 hover:bg-emerald-200"
                          style={{ left: `calc(${inPct}% - 2px)` }}
                          title="Upravit délku animace dopředu"
                          onPointerDown={(e) => startBlockDrag(e, layer.id, "phase-in")}
                        />
                      ) : null}
                      {segments.out.active && onPhaseDurationChange ? (
                        <div
                          className="absolute top-0 z-10 h-full w-1 cursor-ew-resize bg-rose-300/80 hover:bg-rose-200"
                          style={{ left: `calc(${100 - outPct}% - 2px)` }}
                          title="Upravit délku animace dozadu"
                          onPointerDown={(e) => startBlockDrag(e, layer.id, "phase-out")}
                        />
                      ) : null}
                      <span className="pointer-events-none relative z-[1] truncate px-2 text-[9px] font-medium text-white/90">
                        {formatTimelineSeconds(range.startMs)} –{" "}
                        {formatTimelineSeconds(range.startMs + range.durationMs)}
                      </span>
                      <div
                        className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize rounded-r bg-white/20 hover:bg-white/40"
                        onPointerDown={(e) => startBlockDrag(e, layer.id, "resize-right")}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
