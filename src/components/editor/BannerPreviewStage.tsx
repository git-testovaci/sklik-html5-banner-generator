"use client";

import { useEffect, useRef, useState } from "react";
import { formatBannerSize } from "@/lib/banner-sizes";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import { BannerPreview } from "./BannerPreview";
import { PreviewPlaybackControls } from "./PreviewPlaybackControls";

interface BannerPreviewStageProps {
  state: BannerEditorState;
  onUpdate?: BannerEditorStateUpdater;
}

export function BannerPreviewStage({ state, onUpdate }: BannerPreviewStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [replayKey, setReplayKey] = useState(0);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const loopPreview = state.timeline?.loop ?? false;

  useEffect(() => {
    function updateScale() {
      const container = containerRef.current;
      if (!container) return;
      const padding = 48;
      const sx = (container.clientWidth - padding) / state.width;
      const sy = (container.clientHeight - padding) / state.height;
      setScale(Math.min(sx, sy, 1) || 1);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [state.width, state.height]);

  const sizeLabel = formatBannerSize(state.width, state.height);

  return (
    <section
      aria-labelledby="preview-heading"
      className="flex min-h-[320px] flex-1 flex-col rounded-xl border border-zinc-800/80 bg-zinc-950/50 lg:min-h-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 px-4 py-3">
        <h2 id="preview-heading" className="text-sm font-medium text-zinc-300">
          Live preview
        </h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
            <input
              type="checkbox"
              checked={showSafeArea}
              onChange={(e) => setShowSafeArea(e.target.checked)}
              className="rounded border-zinc-600"
            />
            Show safe area
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
            replayKey={replayKey}
            loopPreview={loopPreview}
            showSafeArea={showSafeArea}
          />
        </div>
      </div>

      <PreviewPlaybackControls
        loop={loopPreview}
        onReplay={() => setReplayKey((k) => k + 1)}
        onToggleLoop={(loop) =>
          onUpdate?.({
            timeline: {
              durationMs: state.timeline?.durationMs ?? 3000,
              loop,
              backgroundAnimation: state.timeline?.backgroundAnimation ?? "none",
            },
          })
        }
      />

      <p className="border-t border-zinc-800/60 px-4 py-2 text-center text-xs text-zinc-600">
        Scaled to {Math.round(scale * 100)}% · Replay to test timeline animations
      </p>
    </section>
  );
}
