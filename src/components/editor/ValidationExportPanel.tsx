"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { downloadBlob } from "@/lib/export/download-blob";
import { generateSklikZip } from "@/lib/export/generate-sklik-zip";
import { getPreviewUrl } from "@/lib/share-links";
import type { BannerEditorState } from "@/types/editor";
import type { ExportValidationRow, SklikZipExportResult } from "@/types/export";
import type { ValidationSummary } from "@/types/validation";
import type { ValidationRowStatus } from "@/types/validation";

interface ValidationExportPanelProps {
  state: BannerEditorState;
  validation: ValidationSummary;
  hasUnsavedChanges: boolean;
}

const STATUS_STYLES: Record<
  ValidationRowStatus,
  { badge: string; icon: string }
> = {
  pass: {
    badge: "bg-emerald-950/60 text-emerald-300 ring-emerald-800/50",
    icon: "✓",
  },
  warn: {
    badge: "bg-amber-950/60 text-amber-300 ring-amber-800/50",
    icon: "!",
  },
  fail: {
    badge: "bg-red-950/60 text-red-300 ring-red-800/50",
    icon: "✕",
  },
  info: {
    badge: "bg-zinc-800/80 text-zinc-400 ring-zinc-700/50",
    icon: "i",
  },
  pending: {
    badge: "bg-zinc-800/60 text-zinc-500 ring-zinc-700/50",
    icon: "…",
  },
};

const OVERALL_LABELS = {
  pass: { text: "Ready for export prep", className: "text-emerald-400" },
  warn: { text: "Review warnings before export", className: "text-amber-400" },
  fail: { text: "Fix issues before export", className: "text-red-400" },
} as const;

const EXPORT_SUMMARY_LABELS = {
  pass: { text: "ZIP passed export validation", className: "text-emerald-400" },
  warn: { text: "ZIP exported with warnings", className: "text-amber-400" },
  fail: { text: "ZIP failed export validation", className: "text-red-400" },
} as const;

function ExportRowItem({ row }: { row: ExportValidationRow }) {
  const style = STATUS_STYLES[row.status];
  return (
    <li className="flex items-start justify-between gap-2 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-300">{row.label}</p>
        <p className="text-xs text-zinc-500">{row.message}</p>
      </div>
      <span
        className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs font-medium ring-1 ring-inset ${style.badge}`}
      >
        {style.icon} {row.status.toUpperCase()}
      </span>
    </li>
  );
}

export function ValidationExportPanel({
  state,
  validation,
  hasUnsavedChanges,
}: ValidationExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<SklikZipExportResult | null>(
    null,
  );

  const overall = OVERALL_LABELS[validation.overallStatus];
  const exportSummary = exportResult
    ? EXPORT_SUMMARY_LABELS[exportResult.validationReport.summaryStatus]
    : null;

  const handleCopyLink = useCallback(async () => {
    const url = getPreviewUrl(state.shareId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [state.shareId]);

  async function handleGenerateZip() {
    setExporting(true);
    setExportError(null);

    try {
      const result = await generateSklikZip(state);
      setExportResult(result);

      if (result.validationReport.summaryStatus !== "fail") {
        const downloaded = downloadBlob(result.zipBlob, result.fileName);
        if (!downloaded) {
          setExportError("ZIP generated but download could not start.");
        }
      }
    } catch {
      setExportError("ZIP generation failed. Try again.");
      setExportResult(null);
    } finally {
      setExporting(false);
    }
  }

  function handleDownloadAgain() {
    if (!exportResult) return;
    const downloaded = downloadBlob(exportResult.zipBlob, exportResult.fileName);
    if (!downloaded) {
      setExportError("Download could not start.");
    }
  }

  return (
    <aside
      aria-labelledby="validation-heading"
      className="flex w-full shrink-0 flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/40 lg:w-[320px]"
    >
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 id="validation-heading" className="text-sm font-medium text-zinc-300">
          Validation & export
        </h2>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Editor checks
          </p>
          <ul className="space-y-2" aria-label="Editor validation checks">
            {validation.rows.map((row) => {
              const style = STATUS_STYLES[row.status];
              return (
                <li
                  key={row.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-300">{row.label}</p>
                    <p className="text-xs text-zinc-500">{row.value}</p>
                  </div>
                  <span
                    className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs font-medium ring-1 ring-inset ${style.badge}`}
                  >
                    {style.icon} {row.status.toUpperCase()}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Export readiness
            </p>
            <p className={`mt-1 text-sm font-semibold ${overall.className}`}>
              {overall.text}
            </p>
          </div>
        </div>

        {exportResult ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Export validation
            </p>
            <ul className="space-y-2" aria-label="Export validation checks">
              {exportResult.validationReport.rows.map((row) => (
                <ExportRowItem key={row.id} row={row} />
              ))}
            </ul>
            {exportSummary ? (
              <div className="mt-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Export result
                </p>
                <p className={`mt-1 text-sm font-semibold ${exportSummary.className}`}>
                  {exportSummary.text}
                </p>
                <p className="mt-2 font-mono text-xs text-zinc-400">
                  {exportResult.fileName}
                </p>
                <p className="text-xs text-zinc-500">
                  {Math.max(1, Math.round(exportResult.zipSize / 1024))} kB ·{" "}
                  {exportResult.fileCount} files
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-zinc-800/60 p-4">
        {hasUnsavedChanges ? (
          <p className="text-xs text-amber-400/90">
            Export uses current editor values. Save the project if you want to
            keep these changes.
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleGenerateZip}
          disabled={exporting}
          className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? "Generating ZIP…" : "Generate Sklik ZIP"}
        </button>

        {exportResult &&
        exportResult.validationReport.summaryStatus !== "fail" ? (
          <button
            type="button"
            onClick={handleDownloadAgain}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Download ZIP again
          </button>
        ) : null}

        {exportError ? (
          <p className="text-xs text-red-400" role="alert">
            {exportError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleCopyLink}
          aria-label="Copy preview link"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
        >
          {copied ? "Link copied" : "Copy preview link"}
        </button>

        <Link
          href={`/preview/${state.shareId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
        >
          Open public preview
        </Link>
      </div>
    </aside>
  );
}
