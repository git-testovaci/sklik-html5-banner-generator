"use client";

import { useEffect, useRef, useState } from "react";
import { formatBannerSize } from "@/lib/banner-sizes";
import {
  clampPlacementLoose,
  clampTextPlacementFields,
} from "@/lib/animation/timeline-utils";
import {
  getActiveScene,
  updateBannerLayer,
  updateLayerGeometryFromCanvas,
} from "@/lib/animation/storyboard-utils";
import type { QuickAddLayerType } from "@/lib/animation/layer-factory";
import type { PlaybackController } from "@/lib/playback/use-playback-controller";
import type { BannerAssetPlacement, TextLayerPlacement } from "@/types/assets";
import type { BannerEditorState, BannerEditorStateUpdater, SelectedLayer } from "@/types/editor";
import { BannerPreview } from "./BannerPreview";
import { CanvasQuickAdd } from "./CanvasQuickAdd";
import { PreviewPlaybackControls } from "./PreviewPlaybackControls";

const CANVAS_ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2] as const;

interface BannerPreviewStageProps {
  state: BannerEditorState;
  onUpdate?: BannerEditorStateUpdater;
  selectedLayer: SelectedLayer;
  onSelectLayer: (layer: SelectedLayer) => void;
  playback: PlaybackController;
  onPlayAll?: () => void;
  onReplayScene?: () => void;
  onQuickAdd?: (kind: QuickAddLayerType) => void;
  onSlotActivate?: (layerId: string) => void;
  previewTimeMs?: number | null;
  gateLayersByPreviewTime?: boolean;
}

export function BannerPreviewStage({
  state,
  onUpdate,
  selectedLayer,
  onSelectLayer,
  playback,
  onPlayAll,
  onReplayScene,
  onQuickAdd,
  onSlotActivate,
  previewTimeMs = null,
  gateLayersByPreviewTime = false,
}: BannerPreviewStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [viewZoom, setViewZoom] = useState(1);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const loopPreview = state.timeline?.loop ?? false;
  const activeScene = getActiveScene(state);
  const scale = fitScale * viewZoom;

  useEffect(() => {
    function updateScale() {
      const container = containerRef.current;
      if (!container || container.clientWidth <= 0) return;
      const padding = 24;
      const sx = (container.clientWidth - padding) / state.width;
      const sy = (container.clientHeight - padding) / state.height;
      setFitScale(Math.min(sx, sy, 1) || 1);
    }
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [state.width, state.height]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setViewZoom((z) => {
        const idx = CANVAS_ZOOM_STEPS.findIndex((s) => s >= z - 0.001);
        const nextIdx =
          e.deltaY > 0
            ? Math.max(0, (idx >= 0 ? idx : CANVAS_ZOOM_STEPS.length - 1) - 1)
            : Math.min(CANVAS_ZOOM_STEPS.length - 1, (idx >= 0 ? idx : 0) + 1);
        return CANVAS_ZOOM_STEPS[nextIdx] ?? z;
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function stepCanvasZoom(direction: "in" | "out") {
    setViewZoom((z) => {
      const idx = CANVAS_ZOOM_STEPS.findIndex((s) => Math.abs(s - z) < 0.001);
      const base = idx >= 0 ? idx : CANVAS_ZOOM_STEPS.indexOf(1);
      const nextIdx =
        direction === "in"
          ? Math.min(CANVAS_ZOOM_STEPS.length - 1, base + 1)
          : Math.max(0, base - 1);
      return CANVAS_ZOOM_STEPS[nextIdx] ?? z;
    });
  }

  function updateTextPlacement(
    layerId: TextLayerPlacement["layerId"],
    patch: Partial<TextLayerPlacement>,
  ) {
    const storyboard = updateLayerGeometryFromCanvas(
      state,
      { kind: "text", legacyKey: layerId },
      patch,
    );
    if (storyboard) {
      onUpdate?.(storyboard);
      return;
    }
    onUpdate?.({
      textPlacements: (state.textPlacements ?? []).map((p) =>
        p.layerId === layerId
          ? clampTextPlacementFields({ ...p, ...patch }, state.width, state.height)
          : p,
      ),
    });
  }

  function updateAssetPlacement(assetId: string, patch: Partial<BannerAssetPlacement>) {
    const storyboard = updateLayerGeometryFromCanvas(
      state,
      { kind: "asset", assetId },
      patch,
    );
    if (storyboard) {
      onUpdate?.(storyboard);
      return;
    }
    onUpdate?.({
      assetPlacements: (state.assetPlacements ?? []).map((p) => {
        if (p.assetId !== assetId) return p;
        const merged = { ...p, ...patch };
        return { ...merged, ...clampPlacementLoose(merged, state.width, state.height) };
      }),
    });
  }

  function updateStoryboardLayer(layerId: string, patch: Partial<BannerAssetPlacement>) {
    onUpdate?.(
      updateBannerLayer(state, layerId, {
        x: patch.x,
        y: patch.y,
        width: patch.width,
        height: patch.height,
        opacity: patch.opacity,
        rotation: patch.rotation,
      }),
    );
  }

  const sizeLabel = formatBannerSize(state.width, state.height);
  const playbackScene = state.scenes?.find((s) => s.id === playback.playbackSceneId);
  const sceneLabel =
    playback.mode === "playing-all"
      ? "Přehrávání"
      : playback.mode === "playing-scene" || playback.mode === "paused"
        ? playbackScene?.name ?? activeScene?.name
        : undefined;

  const atMinCanvasZoom = viewZoom <= CANVAS_ZOOM_STEPS[0]!;
  const atMaxCanvasZoom = viewZoom >= CANVAS_ZOOM_STEPS[CANVAS_ZOOM_STEPS.length - 1]!;

  return (
    <section
      aria-labelledby="preview-heading"
      className="flex flex-col rounded-xl border border-zinc-700/50 bg-zinc-950/70 shadow-lg shadow-black/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 px-4 py-2.5">
        <div>
          <h2 id="preview-heading" className="text-sm font-medium text-zinc-200">
            Náhled
          </h2>
          <p className="text-[10px] text-zinc-500">Klikněte na vrstvu — vlastnosti vpravo</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onQuickAdd ? <CanvasQuickAdd onAdd={onQuickAdd} /> : null}
          <div className="flex items-center rounded border border-zinc-800/80 bg-zinc-900/60">
            <button
              type="button"
              disabled={atMinCanvasZoom}
              onClick={() => stepCanvasZoom("out")}
              className="min-w-[1.75rem] px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800/60 disabled:opacity-30"
              aria-label="Oddálit náhled"
            >
              −
            </button>
            <span className="min-w-[2.75rem] border-x border-zinc-800/80 px-2 py-1 text-center text-[10px] font-medium text-violet-300">
              {Math.round(viewZoom * 100)} %
            </span>
            <button
              type="button"
              disabled={atMaxCanvasZoom}
              onClick={() => stepCanvasZoom("in")}
              className="min-w-[1.75rem] px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800/60 disabled:opacity-30"
              aria-label="Přiblížit náhled"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => setViewZoom(1)}
            className="rounded border border-zinc-800/80 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800/60"
          >
            Přizpůsobit
          </button>
          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={showSafeArea}
              onChange={(e) => setShowSafeArea(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Bezpečná zóna
          </label>
          <span className="font-mono text-xs text-zinc-500">{sizeLabel}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex h-[min(340px,38vh)] min-h-[200px] items-center justify-center overflow-hidden p-2 sm:p-3"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(63 63 70 / 0.35) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
          <BannerPreview
            state={state}
            replayKey={playback.replayKey}
            loopPreview={loopPreview}
            showSafeArea={showSafeArea}
            interactive={!playback.isPlaying}
            canvasScale={scale}
            selectedLayer={selectedLayer}
            onSelectLayer={onSelectLayer}
            onUpdateTextPlacement={updateTextPlacement}
            onUpdateAssetPlacement={updateAssetPlacement}
            onUpdateStoryboardLayer={updateStoryboardLayer}
            playAll={playback.playAllView}
            playbackSceneId={playback.playbackSceneId}
            playbackPaused={playback.isPaused}
            previewTimeMs={previewTimeMs}
            gateLayersByPreviewTime={gateLayersByPreviewTime}
            onSlotActivate={onSlotActivate}
          />
        </div>
      </div>

      <PreviewPlaybackControls
        mode={playback.mode}
        loop={loopPreview}
        playbackTimeMs={playback.playbackTimeMs}
        onPlayAll={onPlayAll}
        onReplayScene={onReplayScene}
        onPause={playback.pause}
        onResume={playback.resume}
        onStop={playback.stop}
        onToggleLoop={(loop) =>
          onUpdate?.({
            timeline: {
              durationMs: state.timeline?.durationMs ?? 3000,
              loop,
              backgroundAnimation: state.timeline?.backgroundAnimation ?? "none",
            },
          })
        }
        sceneLabel={sceneLabel}
      />

      <p className="border-t border-zinc-800/60 px-4 py-1.5 text-center text-xs text-zinc-600">
        Přetáhněte vrstvy · rohy mění velikost · Ctrl + kolečko = zoom
      </p>
    </section>
  );
}
