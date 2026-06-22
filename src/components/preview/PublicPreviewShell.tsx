"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatBannerSize } from "@/lib/banner-sizes";
import type { BannerEditorState } from "@/types/editor";
import { BannerPreview } from "@/components/editor/BannerPreview";

interface PublicPreviewShellProps {
  state: BannerEditorState;
}

export function PublicPreviewShell({ state }: PublicPreviewShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const sizeLabel = formatBannerSize(state.width, state.height);

  useEffect(() => {
    function updateScale() {
      const container = containerRef.current;
      if (!container) return;

      const padding = 64;
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

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Sklik HTML5 Banner Generator
            </p>
            <h1 className="mt-1 text-lg font-semibold text-zinc-100">{state.name}</h1>
            <p className="mt-1 font-mono text-sm text-zinc-500">{sizeLabel}</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Back to studio
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6">
        <p className="mb-6 text-center text-sm text-zinc-500">
          Preview only. Editing is disabled.
        </p>

        <div
          ref={containerRef}
          className="flex flex-1 items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-8"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(63 63 70 / 0.35) 1px, transparent 0)",
            backgroundSize: "20px 20px",
            minHeight: "360px",
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
      </main>
    </div>
  );
}
