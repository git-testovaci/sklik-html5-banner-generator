"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildRulerTicks,
  cycleTimelineZoom,
  formatTimelineSeconds,
  getLayerTimelineRange,
  getTimelineLayersForScene,
  isEditableKeyboardTarget,
  isTimelineLayerSelected,
  isTimelineRowReorderable,
  layerBlockTooltip,
  layerTimelineBlockColor,
  layerTimelineTypeGlyph,
  moveLayerInSceneStack,
  selectionForBannerLayer,
  TIMELINE_LABEL_WIDTH_PX,
  TIMELINE_ROW_HEIGHT_PX,
  TIMELINE_RULER_HEIGHT_PX,
  timelineTrackWidthPx,
  type TimelineZoomLevel,
} from "@/lib/animation/layer-timeline-utils";
import { layerDisplayStackLabel } from "@/lib/animation/layer-instance-utils";
import {
  getLayerById,
  getActiveScene,
  patchBannerLayerSlice,
  resolveBannerLayerForSelection,
} from "@/lib/animation/storyboard-utils";
import {
  getLayerPhaseSegments,
  phaseSegmentTooltip,
} from "@/lib/animation/layer-phase-utils";
import type { BannerLayer } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater, SelectedLayer } from "@/types/editor";

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
  onNudgeLayer?: (layerId: string, deltaMs: number) => void;
  onDuplicateLayer?: (layerId: string) => void;
  onDeleteLayer?: (layerId: string) => void;
  onUpdate?: BannerEditorStateUpdater;
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

export function UnifiedLayerTimeline({
  state,
  selectedLayer,
  onSelectLayer,
  playheadMs,
  isPlaying,
  onScrub,
  onRangeChange,
  onPhaseDurationChange,
  onNudgeLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onUpdate,
}: UnifiedLayerTimelineProps) {
  const scene = getActiveScene(state);
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const liveRangeRef = useRef<{ layerId: string; startMs: number; durationMs: number } | null>(
    null,
  );
  const [livePhase, setLivePhase] = useState<{
    layerId: string;
    inMs: number;
    outMs: number;
  } | null>(null);
  const livePhaseRef = useRef<{ layerId: string; inMs: number; outMs: number } | null>(null);

  const [liveRange, setLiveRange] = useState<{
    layerId: string;
    startMs: number;
    durationMs: number;
  } | null>(null);
  const [livePlayheadMs, setLivePlayheadMs] = useState<number | null>(null);
  const [zoom, setZoom] = useState<TimelineZoomLevel>(1);
  const [timelineFocused, setTimelineFocused] = useState(false);
  const scrubDragRef = useRef(false);
  const [dragStackLayerId, setDragStackLayerId] = useState<string | null>(null);
  const [dropStackIndex, setDropStackIndex] = useState<number | null>(null);
  const dropStackIndexRef = useRef<number | null>(null);

  function patchLayer(layerId: string, patch: Partial<BannerLayer>) {
    onUpdate?.(patchBannerLayerSlice(state, layerId, patch));
  }

  const resolveStackDropIndex = useCallback((clientY: number): number => {
    const rows = rowsRef.current?.querySelectorAll("[data-timeline-row]");
    if (!rows || rows.length === 0) return 0;
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i]!.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return rows.length - 1;
  }, []);

  const sceneDurationMs = scene?.durationMs ?? 3000;
  const trackWidthPx = timelineTrackWidthPx(zoom);
  const layers = scene ? getTimelineLayersForScene(state, scene.id) : [];
  const ticks = buildRulerTicks(sceneDurationMs, zoom);
  const displayPlayheadMs = livePlayheadMs ?? playheadMs;
  const playheadPct =
    sceneDurationMs > 0 ? (displayPlayheadMs / sceneDurationMs) * 100 : 0;
  const selectedBannerLayer = resolveBannerLayerForSelection(state, selectedLayer);

  useEffect(() => {
    if (!dragStackLayerId || !scene) return;

    function onMove(e: PointerEvent) {
      const idx = resolveStackDropIndex(e.clientY);
      dropStackIndexRef.current = idx;
      setDropStackIndex(idx);
    }

    function onUp() {
      const targetIdx = dropStackIndexRef.current;
      if (dragStackLayerId != null && targetIdx != null) {
        onUpdate?.(moveLayerInSceneStack(state, scene!.id, dragStackLayerId, targetIdx));
      }
      setDragStackLayerId(null);
      setDropStackIndex(null);
      dropStackIndexRef.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragStackLayerId, scene, state, onUpdate, resolveStackDropIndex]);

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
            Math.min(drag.initialPhaseInMs + dBlockMs, blockDur - outMs - 100),
          );
          if (inMs > 0 && inMs < 100) inMs = 100;
        } else {
          outMs = Math.max(
            0,
            Math.min(drag.initialPhaseOutMs - dBlockMs, blockDur - inMs - 100),
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

  useEffect(() => {
    function scrubFromX(clientX: number) {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ms = Math.max(
        0,
        Math.min(sceneDurationMs, msFromClientX(clientX, rect, sceneDurationMs)),
      );
      setLivePlayheadMs(ms);
      onScrub(ms);
    }

    function onMove(e: PointerEvent) {
      if (!scrubDragRef.current) return;
      scrubFromX(e.clientX);
    }

    function onUp() {
      if (!scrubDragRef.current) return;
      scrubDragRef.current = false;
      setLivePlayheadMs(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [onScrub, sceneDurationMs]);

  useEffect(() => {
    if (!timelineFocused) return;

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableKeyboardTarget(e.target)) return;
      if (!onNudgeLayer || !selectedBannerLayer || selectedBannerLayer.locked) return;

      let delta = 0;
      if (e.key === "ArrowLeft") delta = e.shiftKey ? -500 : -100;
      else if (e.key === "ArrowRight") delta = e.shiftKey ? 500 : 100;
      else return;

      e.preventDefault();
      onNudgeLayer(selectedBannerLayer.id, delta);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [timelineFocused, selectedBannerLayer, onNudgeLayer]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => cycleTimelineZoom(z, e.deltaY > 0 ? "out" : "in"));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function focusTimeline() {
    rootRef.current?.focus({ preventScroll: true });
  }

  function startScrubDrag(e: React.PointerEvent) {
    if (isPlaying) return;
    e.preventDefault();
    e.stopPropagation();
    focusTimeline();
    scrubDragRef.current = true;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ms = Math.max(
      0,
      Math.min(sceneDurationMs, msFromClientX(e.clientX, rect, sceneDurationMs)),
    );
    setLivePlayheadMs(ms);
    onScrub(ms);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function startBlockDrag(
    e: React.PointerEvent,
    layerId: string,
    mode: DragMode,
  ) {
    e.preventDefault();
    e.stopPropagation();
    focusTimeline();
    const layer = getLayerById(state, layerId);
    if (layer?.locked) {
      onSelectLayer(selectionForBannerLayer(layer));
      return;
    }
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
    if (dragRef.current || scrubDragRef.current) return;
    if (isPlaying) return;
    if ((e.target as HTMLElement).closest("[data-layer-block]")) return;
    if ((e.target as HTMLElement).closest("[data-playhead-handle]")) return;
    startScrubDrag(e);
  }

  function renderTrackArea(
    children: React.ReactNode,
    extraClass = "",
    attachRef = false,
  ) {
    return (
      <div
        ref={attachRef ? trackRef : undefined}
        className={`relative shrink-0 bg-zinc-900/20 ${extraClass}`}
        style={{ width: trackWidthPx }}
        onPointerDown={handleTrackScrub}
      >
        {children}
      </div>
    );
  }

  function renderPlayhead() {
    return (
      <div
        data-playhead-handle
        className="absolute top-0 z-30 h-full cursor-ew-resize touch-none"
        style={{ left: `${Math.min(100, playheadPct)}%`, transform: "translateX(-50%)" }}
        title={`Playhead · ${formatTimelineSeconds(displayPlayheadMs)} · táhněte pro posun`}
        onPointerDown={startScrubDrag}
        aria-label="Posun playheadu"
      >
        <div className="absolute -left-5 top-0 h-full w-10" aria-hidden />
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
          <div className="h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-violet-400 drop-shadow-[0_0_4px_rgba(167,139,250,0.9)]" />
        </div>
        <div className="pointer-events-none absolute top-[7px] bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.85)]" />
        {livePlayheadMs != null ? (
          <span className="pointer-events-none absolute -top-5 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded bg-violet-600 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow">
            {formatTimelineSeconds(displayPlayheadMs)}
          </span>
        ) : null}
      </div>
    );
  }

  if (!scene) {
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-6 text-center">
        <p className="text-xs text-zinc-500">Scéna není k dispozici.</p>
      </section>
    );
  }

  const atMaxZoom = zoom >= 3;
  const atMinZoom = zoom <= 1;

  return (
    <section
      ref={rootRef}
      id="unified-layer-timeline"
      tabIndex={0}
      className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 outline-none focus-visible:ring-1 focus-visible:ring-violet-700/50"
      onFocus={() => setTimelineFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setTimelineFocused(false);
        }
      }}
      onPointerDown={focusTimeline}
    >
      {/* Header controls */}
      <div className="border-b border-zinc-800/60 px-4 py-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-zinc-200">Časová osa scény</h2>
            <p className="text-[10px] text-zinc-500">
              Scéna: {scene.name}
              {isPlaying ? " · přehrávání" : timelineFocused ? " · klávesové zkratky aktivní" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-zinc-800/80 bg-zinc-900/60 px-2 py-1 font-mono text-[11px] text-violet-200">
              {formatTimelineSeconds(displayPlayheadMs)} / {formatTimelineSeconds(sceneDurationMs)}
            </span>
            <div className="flex items-center rounded border border-zinc-800/80 bg-zinc-900/60">
              <span className="hidden pl-2 text-[9px] text-zinc-600 sm:inline">Zoom</span>
              <button
                type="button"
                disabled={atMinZoom}
                onClick={() => setZoom((z) => cycleTimelineZoom(z, "out"))}
                className="min-w-[2rem] px-2.5 py-1 text-base font-medium text-zinc-300 hover:bg-zinc-800/60 disabled:opacity-30"
                title="Oddálit (Ctrl + kolečko)"
                aria-label="Oddálit časovou osu"
              >
                −
              </button>
              <span
                className="min-w-[2.5rem] border-x border-zinc-800/80 px-2 py-1 text-center text-[10px] font-medium text-violet-300"
                title="Měřítko časové osy · Ctrl + kolečko myši"
              >
                {zoom}×
              </span>
              <button
                type="button"
                disabled={atMaxZoom}
                onClick={() => setZoom((z) => cycleTimelineZoom(z, "in"))}
                className="min-w-[2rem] px-2.5 py-1 text-base font-medium text-zinc-300 hover:bg-zinc-800/60 disabled:opacity-30"
                title="Přiblížit (Ctrl + kolečko)"
                aria-label="Přiblížit časovou osu"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="rounded border border-zinc-800/80 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800/60"
            >
              Přizpůsobit
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-600">
          Nahoře = vpředu na plátně · ⋮⋮ přetáhněte řádek · Ctrl + kolečko = zoom
        </p>
      </div>

      <div className="overflow-x-auto">
        <div
          className="min-w-0"
          style={{ width: TIMELINE_LABEL_WIDTH_PX + trackWidthPx }}
        >
          {/* Ruler */}
          <div className="flex border-b border-zinc-800/50" style={{ height: TIMELINE_RULER_HEIGHT_PX }}>
            <div
              className="shrink-0 border-r border-zinc-800/50 bg-zinc-900/50 px-2 py-1"
              style={{ width: TIMELINE_LABEL_WIDTH_PX }}
            >
              <span className="text-[9px] uppercase tracking-wide text-zinc-600">Čas</span>
            </div>
            {renderTrackArea(
              <>
                {ticks.map((t) => {
                  const left = sceneDurationMs > 0 ? (t / sceneDurationMs) * 100 : 0;
                  const isPlayheadTick =
                    Math.abs(t - displayPlayheadMs) < (ticks[1] ?? 500) * 0.25;
                  return (
                    <div
                      key={t}
                      className={`pointer-events-none absolute top-0 h-full border-l ${
                        isPlayheadTick ? "border-violet-500/50" : "border-zinc-700/40"
                      }`}
                      style={{ left: `${left}%` }}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 text-[9px] ${
                          isPlayheadTick ? "font-medium text-violet-400" : "text-zinc-600"
                        }`}
                      >
                        {(t / 1000).toFixed(t >= 10000 ? 0 : t % 1000 === 0 ? 0 : 1)}s
                      </span>
                    </div>
                  );
                })}
                {renderPlayhead()}
              </>,
              "cursor-crosshair bg-zinc-900/30",
              true,
            )}
          </div>

          {layers.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-xs font-medium text-zinc-400">Časová osa je prázdná</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                V záložce Média nahrajte soubor a klikněte{" "}
                <span className="font-medium text-violet-300">+ Přidat na časovou osu</span>.
                Text můžete přidat přímo na plátně.
              </p>
            </div>
          ) : (
            <div ref={rowsRef}>
            {layers.map((layer, index) => {
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
              const blockTitle = layerBlockTooltip(layer, range);
              const rowLabel = layerDisplayStackLabel(layer, state);
              const canReorder = isTimelineRowReorderable(layer);
              const isStackDragging = dragStackLayerId === layer.id;
              const isDropTarget =
                dropStackIndex === index &&
                dragStackLayerId != null &&
                dragStackLayerId !== layer.id;

              return (
                <div
                  key={layer.id}
                  data-timeline-row
                  className={`flex border-b border-zinc-800/30 ${
                    selected ? "bg-violet-950/30 ring-1 ring-inset ring-violet-700/40" : ""
                  } ${!layer.visible ? "opacity-45" : ""} ${
                    isDropTarget ? "ring-1 ring-inset ring-violet-500/70" : ""
                  } ${isStackDragging ? "opacity-50" : ""}`}
                  style={{ height: TIMELINE_ROW_HEIGHT_PX }}
                >
                  <div
                    className={`flex shrink-0 items-stretch border-r border-zinc-800/50 ${
                      selected ? "bg-violet-950/40" : "bg-zinc-900/40"
                    }`}
                    style={{ width: TIMELINE_LABEL_WIDTH_PX }}
                  >
                    {canReorder ? (
                      <button
                        type="button"
                        className="flex w-5 shrink-0 cursor-grab items-center justify-center text-[10px] text-zinc-600 hover:text-zinc-400 active:cursor-grabbing"
                        title="Přetáhnout pořadí vrstev"
                        aria-label="Přetáhnout pořadí vrstev"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragStackLayerId(layer.id);
                          setDropStackIndex(index);
                          dropStackIndexRef.current = index;
                          onSelectLayer(selectionForBannerLayer(layer));
                        }}
                      >
                        ⋮⋮
                      </button>
                    ) : (
                      <span className="w-5 shrink-0" aria-hidden />
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectLayer(selectionForBannerLayer(layer))}
                      className={`flex min-w-0 flex-1 items-center gap-1 px-0.5 text-left ${
                        selected ? "text-violet-200" : "text-zinc-400 hover:text-zinc-300"
                      }`}
                      title={blockTitle}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                          selected ? "bg-violet-800/50 text-violet-100" : "bg-zinc-800/80 text-zinc-500"
                        }`}
                      >
                        {layerTimelineTypeGlyph(layer)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[10px] leading-tight">
                        {layer.locked ? "🔒 " : ""}
                        {!layer.visible ? "👁‍🗨 " : ""}
                        {rowLabel}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-px pr-0.5">
                      {onDuplicateLayer && !layer.persistent ? (
                        <button
                          type="button"
                          title="Duplikovat vrstvu"
                          aria-label="Duplikovat vrstvu"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateLayer(layer.id);
                          }}
                          className="rounded px-0.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                        >
                          ⧉
                        </button>
                      ) : null}
                      {onUpdate ? (
                        <button
                          type="button"
                          title={layer.visible ? "Skrýt vrstvu" : "Zobrazit vrstvu"}
                          aria-label={layer.visible ? "Skrýt vrstvu" : "Zobrazit vrstvu"}
                          onClick={(e) => {
                            e.stopPropagation();
                            patchLayer(layer.id, { visible: !layer.visible });
                          }}
                          className="rounded px-0.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                        >
                          {layer.visible ? "👁" : "👁‍🗨"}
                        </button>
                      ) : null}
                      {onUpdate ? (
                        <button
                          type="button"
                          title={layer.locked ? "Odemknout vrstvu" : "Zamknout vrstvu"}
                          aria-label={layer.locked ? "Odemknout vrstvu" : "Zamknout vrstvu"}
                          onClick={(e) => {
                            e.stopPropagation();
                            patchLayer(layer.id, { locked: !layer.locked });
                          }}
                          className="rounded px-0.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                        >
                          {layer.locked ? "🔓" : "🔒"}
                        </button>
                      ) : null}
                      {onDeleteLayer ? (
                        <button
                          type="button"
                          title="Smazat vrstvu"
                          aria-label="Smazat vrstvu"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLayer(layer.id);
                          }}
                          className="rounded px-0.5 py-0.5 text-[10px] text-red-500/80 hover:bg-red-950/40 hover:text-red-400"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {renderTrackArea(
                    <div
                      data-layer-block
                      className={`absolute top-1.5 flex h-[calc(100%-12px)] items-center rounded-md border border-white/10 ${
                        layer.locked
                          ? "cursor-not-allowed opacity-75"
                          : "cursor-grab active:cursor-grabbing"
                      } ${blockColor} ${
                        selected ? "ring-2 ring-violet-400/90 shadow-[0_0_0_1px_rgba(167,139,250,0.3)]" : ""
                      } ${!layer.visible ? "border-dashed opacity-60" : ""}`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 0.4)}%`,
                        minWidth: 10,
                      }}
                      title={blockTitle}
                      onPointerDown={(e) => {
                        if (layer.locked) {
                          e.stopPropagation();
                          onSelectLayer(selectionForBannerLayer(layer));
                          return;
                        }
                        startBlockDrag(e, layer.id, "move");
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLayer(selectionForBannerLayer(layer));
                      }}
                    >
                      {!layer.locked ? (
                        <div
                          className="absolute left-0 top-0 z-20 h-full w-3 cursor-ew-resize rounded-l-md bg-white/25 hover:bg-white/50"
                          title="Upravit začátek bloku"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startBlockDrag(e, layer.id, "resize-left");
                          }}
                        />
                      ) : null}
                      {segments.in.active && inPct > 0 ? (
                        <div
                          className="pointer-events-none absolute left-0 top-0 h-full border-r border-white/25 bg-gradient-to-r from-white/25 to-transparent"
                          style={{ width: `${inPct}%` }}
                          title={phaseSegmentTooltip(segments.in, "in")}
                        >
                          {inPct > 14 ? (
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-white/90">
                              Dopředu
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
                        />
                      ) : null}
                      {segments.out.active && outPct > 0 ? (
                        <div
                          className="pointer-events-none absolute right-0 top-0 h-full border-l border-white/25 bg-gradient-to-l from-white/25 to-transparent"
                          style={{ width: `${outPct}%` }}
                          title={phaseSegmentTooltip(segments.out, "out")}
                        />
                      ) : null}
                      {segments.in.active && onPhaseDurationChange && !layer.locked ? (
                        <div
                          className="absolute top-0 z-10 h-full w-1.5 cursor-ew-resize bg-emerald-300/80 hover:bg-emerald-200"
                          style={{ left: `calc(${inPct}% - 3px)` }}
                          title="Upravit délku animace dopředu"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startBlockDrag(e, layer.id, "phase-in");
                          }}
                        />
                      ) : null}
                      {segments.out.active && onPhaseDurationChange && !layer.locked ? (
                        <div
                          className="absolute top-0 z-10 h-full w-1.5 cursor-ew-resize bg-rose-300/80 hover:bg-rose-200"
                          style={{ left: `calc(${100 - outPct}% - 3px)` }}
                          title="Upravit délku animace dozadu"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startBlockDrag(e, layer.id, "phase-out");
                          }}
                        />
                      ) : null}
                      {widthPct > 8 ? (
                        <span className="pointer-events-none relative z-[1] truncate px-2.5 text-[9px] font-medium text-white/90">
                          {formatTimelineSeconds(range.durationMs)}
                        </span>
                      ) : null}
                      {!layer.locked ? (
                        <div
                          className="absolute right-0 top-0 z-20 h-full w-3 cursor-ew-resize rounded-r-md bg-white/25 hover:bg-white/50"
                          title="Upravit konec bloku"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            startBlockDrag(e, layer.id, "resize-right");
                          }}
                        />
                      ) : null}
                    </div>,
                  )}
                </div>
              );
            })
            }
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
