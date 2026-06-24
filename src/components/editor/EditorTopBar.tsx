"use client";

import Link from "next/link";
import { formatBannerSize } from "@/lib/banner-sizes";
import { getPreviewUrl } from "@/lib/share-links";
import type { BannerEditorState } from "@/types/editor";
import { ProjectStatusBadge } from "@/components/dashboard/ProjectStatusBadge";

interface EditorTopBarProps {
  state: BannerEditorState;
  hasUnsavedChanges: boolean;
  saveStatus: "idle" | "saved";
  saveError?: string | null;
  onSave: () => void;
  onExport?: () => void;
  exportReady?: boolean;
}

export function EditorTopBar({
  state,
  hasUnsavedChanges,
  saveStatus,
  saveError = null,
  onSave,
  onExport,
  exportReady = false,
}: EditorTopBarProps) {
  const sizeLabel = formatBannerSize(state.width, state.height);
  const previewPath = `/preview/${state.shareId}`;

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Zpět
          </Link>
          <span className="hidden text-zinc-700 sm:inline" aria-hidden="true">|</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-semibold text-zinc-100 sm:text-lg">
                {state.name}
              </h1>
              <ProjectStatusBadge status={state.status} />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-violet-400/90">
              Sklik HTML5 banner · {sizeLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {hasUnsavedChanges ? (
            <span className="text-xs font-medium text-amber-400">Neuložené změny</span>
          ) : saveStatus === "saved" ? (
            <span className="text-xs font-medium text-emerald-400">Uloženo lokálně</span>
          ) : (
            <span className="text-xs text-zinc-600">Uloženo v prohlížeči</span>
          )}
          {saveError ? (
            <span className="text-xs font-medium text-red-400" role="alert">{saveError}</span>
          ) : null}
          <Link
            href={previewPath}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800/50"
            title={getPreviewUrl(state.shareId)}
          >
            Náhled
          </Link>
          {onExport ? (
            <button
              type="button"
              onClick={onExport}
              aria-label="Export ZIP"
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                exportReady
                  ? "border-emerald-800/60 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              Export ZIP
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={!hasUnsavedChanges}
            aria-label={hasUnsavedChanges ? "Uložit změny projektu" : "Žádné změny k uložení"}
            className="inline-flex items-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Uložit
          </button>
        </div>
      </div>
    </header>
  );
}
