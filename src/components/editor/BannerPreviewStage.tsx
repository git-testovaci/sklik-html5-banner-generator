"use client";

import { useEffect, useRef, useState } from "react";
import { formatBannerSize } from "@/lib/banner-sizes";
import type { BannerEditorState } from "@/types/editor";
import { BannerPreview } from "./BannerPreview";

interface BannerPreviewStageProps {
  state: BannerEditorState;
}

export function BannerPreviewStage({ state }: BannerPreviewStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      const container = containerRef.current;
      if (!container) return;

      const padding = 48;
      const availableWidth = container.clientWidth - padding;
      const availableHeight = container.clientHeight - padding;

      const scaleX = availableWidth / state.width;
      const scaleY = availableHeight / state.height;
      const nextScale = Math.min(scaleX, scaleY, 1);

      setScale(nextScale > 0 ? nextScale : 1);
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [state.width, state.height]);

  const sizeLabel = formatBannerSize(state.width, state.height);

  return (
    <section
      aria-labelledby="preview-heading"
      className="flex min-h-[280px] flex-1 flex-col rounded-xl border border-zinc-800/80 bg-zinc-950/50 lg:min-h-0"
    >
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
        <h2 id="preview-heading" className="text-sm font-medium text-zinc-300">
          Live preview
        </h2>
        <span className="font-mono text-xs text-zinc-500">{sizeLabel}</span>
      </div>

      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden p-6"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(63 63 70 / 0.35) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <BannerPreview state={state} />
        </div>
      </div>

      <p className="border-t border-zinc-800/60 px-4 py-2 text-center text-xs text-zinc-600">
        Scaled to {Math.round(scale * 100)}% · Actual size {sizeLabel}
      </p>
    </section>
  );
}
