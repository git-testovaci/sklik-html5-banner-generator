"use client";

import { useEffect, useRef, useState } from "react";
import { formatBannerSize } from "@/lib/banner-sizes";

interface ImportedBannerPreviewProps {
  previewHtml: string | null;
  width: number;
  height: number;
  warning?: string | null;
}

export function ImportedBannerPreview({
  previewHtml,
  width,
  height,
  warning,
}: ImportedBannerPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const sizeLabel = formatBannerSize(width, height);

  useEffect(() => {
    function updateScale() {
      const container = containerRef.current;
      if (!container) return;
      const pad = 48;
      const sx = (container.clientWidth - pad) / width;
      const sy = (container.clientHeight - pad) / height;
      setScale(Math.min(sx, sy, 1) || 1);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [width, height]);

  return (
    <section className="flex min-h-[320px] flex-col rounded-xl border border-zinc-800/80 bg-zinc-950/50">
      <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
        <div>
          <h2 className="text-sm font-medium text-zinc-300">Sandbox preview</h2>
          <p className="text-xs text-zinc-500">Isolated iframe · scripts disabled</p>
        </div>
        <span className="font-mono text-xs text-zinc-500">{sizeLabel}</span>
      </div>
      <div className="space-y-0 border-b border-zinc-800/60 bg-zinc-950/30 px-4 py-2 text-xs leading-relaxed text-zinc-500">
        <p>
          JS animations do not run here because the sandbox disables scripts.
          Layout and static styles may still appear.
        </p>
        <p className="mt-1 text-zinc-600">
          Preview may differ from the original banner when opened in Sklik or a browser.
        </p>
      </div>
      {warning ? (
        <p className="border-b border-amber-900/40 bg-amber-950/20 px-4 py-2 text-xs text-amber-300">
          {warning}
        </p>
      ) : null}
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-6"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(63 63 70 / 0.35) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      >
        {previewHtml ? (
          <div style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
            <iframe
              title="Imported banner sandbox preview"
              sandbox=""
              srcDoc={previewHtml}
              style={{ width, height, border: "none", background: "#000" }}
              className="shadow-2xl"
            />
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No preview available</p>
        )}
      </div>
    </section>
  );
}
