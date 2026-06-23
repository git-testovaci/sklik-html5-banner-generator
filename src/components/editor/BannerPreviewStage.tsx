"use client";

import { useEffect, useRef, useState } from "react";
import { formatBannerSize } from "@/lib/banner-sizes";
import {
  clampPlacementLoose,
  clampTextPlacementFields,
} from "@/lib/animation/timeline-utils";
import {
  getActiveScene,
  totalStoryboardDurationMs,
  updateBannerLayer,
  updateLayerGeometryFromCanvas,
} from "@/lib/animation/storyboard-utils";
import type { QuickAddLayerType } from "@/lib/animation/layer-factory";
import type { PlaybackController } from "@/lib/playback/use-playback-controller";
import type { BannerAssetPlacement, TextLayerPlacement } from "@/types/assets";
import type { BannerEditorState, BannerEditorStateUpdater, SelectedLayer } from "@/types/editor";
import { BannerPreview } from "./BannerPreview";
import { CanvasQuickAdd } from "./CanvasQuickAdd";
import { PlaybackTimeline } from "./PlaybackTimeline";
import { PreviewPlaybackControls } from "./PreviewPlaybackControls";

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
  const [scale, setScale] = useState(1);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const loopPreview = state.timeline?.loop ?? false;
  const activeScene = getActiveScene(state);

  useEffect(() => {
    function updateScale() {
      const container = containerRef.current;
      if (!container || container.clientWidth <= 0) return;
      const padding = 48;
      const sx = (container.clientWidth - padding) / state.width;
      const sy = (container.clientHeight - padding) / state.height;
      setScale(Math.min(sx, sy, 1) || 1);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [state.width, state.height]);

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
      ? `Přehrávání · ${playbackScene?.name ?? "všechny scény"}`
      : playback.mode === "playing-scene" || playback.mode === "paused"
        ? playbackScene?.name ?? activeScene?.name
        : activeScene
          ? `${activeScene.name} · ${(activeScene.durationMs / 1000).toFixed(1)} s`
          : undefined;

  return (
    <section
      aria-labelledby="preview-heading"
      className="flex min-h-[320px] flex-1 flex-col rounded-xl border border-zinc-800/80 bg-zinc-950/50 lg:min-h-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 px-4 py-3">
        <h2 id="preview-heading" className="text-sm font-medium text-zinc-300">
          Náhled plátna
        </h2>
        <div className="flex items-center gap-3">
          {onQuickAdd ? <CanvasQuickAdd onAdd={onQuickAdd} /> : null}
          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={showSafeArea}
              onChange={(e) => setShowSafeArea(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Safe area
          </label>
          <span className="font-mono text-xs text-zinc-500">{sizeLabel}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-6"
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
        sceneLabel={
          playback.mode === "playing-all"
            ? `Přehrávání vše · ${(totalStoryboardDurationMs(state) / 1000).toFixed(1)} s`
            : sceneLabel
        }
      />

      <div className="border-t border-zinc-800/60 px-4 py-3">
        <PlaybackTimeline
          state={state}
          mode={playback.mode}
          playAllView={playback.playAllView}
          playbackTimeMs={playback.playbackTimeMs}
          playbackSceneId={playback.playbackSceneId}
        />
      </div>

      <p className="border-t border-zinc-800/60 px-4 py-2 text-center text-xs text-zinc-600">
        Přetáhněte vrstvy · rohy mění velikost · {Math.round(scale * 100)} %
      </p>
    </section>
  );
}
