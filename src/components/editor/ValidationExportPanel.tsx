"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  pass: { text: "Připraveno k exportu", className: "text-emerald-400" },
  warn: { text: "Zkontrolujte upozornění před exportem", className: "text-amber-400" },
  fail: { text: "Opravte chyby před exportem", className: "text-red-400" },
} as const;

const EXPORT_SUMMARY_LABELS = {
  pass: { text: "OK", className: "text-emerald-400" },
  warn: { text: "VAROVÁNÍ", className: "text-amber-400" },
  fail: { text: "CHYBA", className: "text-red-400" },
} as const;

const STATUS_LABELS: Record<ValidationRowStatus, string> = {
  pass: "OK",
  warn: "VAR",
  fail: "CHYBA",
  info: "INFO",
  pending: "…",
};

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
        {style.icon} {STATUS_LABELS[row.status]}
      </span>
    </li>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

export function ValidationExportPanel({
  state,
  validation,
  hasUnsavedChanges,
}: ValidationExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [exportResult, setExportResult] = useState<SklikZipExportResult | null>(
    null,
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const overall = OVERALL_LABELS[validation.overallStatus];
  const exportSummary = exportResult
    ? EXPORT_SUMMARY_LABELS[exportResult.validationReport.summaryStatus]
    : null;
  const exportPassed =
    exportResult?.validationReport.summaryStatus !== "fail";

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
    setDownloadStarted(false);

    try {
      const result = await generateSklikZip(state);
      if (!mountedRef.current) return;

      setExportResult(result);

      const missingAsset = result.validationReport.rows.some(
        (r) => r.id.startsWith("missing-asset") && r.status === "fail",
      );

      if (missingAsset) {
        setExportError(
          result.validationReport.rows.find((r) => r.id.startsWith("missing-asset"))
            ?.message ?? "Export blokován — nejdříve opravte chybějící assety.",
        );
      } else if (result.validationReport.summaryStatus !== "fail") {
        const downloaded = downloadBlob(result.zipBlob, result.fileName);
        setDownloadStarted(downloaded);
        if (!downloaded) {
          setExportError("ZIP vygenerován, ale stahování se nespustilo.");
        }
      } else {
        setExportError("Validace exportu selhala. Zkontrolujte položky výše.");
      }
    } catch {
      if (!mountedRef.current) return;
      setExportError("Generování ZIP selhalo. Zkuste to znovu.");
      setExportResult(null);
    } finally {
      if (mountedRef.current) {
        setExporting(false);
      }
    }
  }

  function handleDownloadAgain() {
    if (!exportResult) return;
    const downloaded = downloadBlob(exportResult.zipBlob, exportResult.fileName);
    setDownloadStarted(downloaded);
    if (!downloaded) {
      setExportError("Stahování se nepodařilo spustit.");
    }
  }

  return (
    <aside
      aria-labelledby="validation-heading"
      className="flex w-full shrink-0 flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/40 lg:w-[320px]"
    >
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 id="validation-heading" className="text-sm font-medium text-zinc-300">
          Validace a export
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Vygenerujte Sklik ZIP pro ruční nahrání. OK = připraveno, VAR = zkontrolovat, CHYBA = blokováno.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Kontrola v editoru
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
                    {style.icon} {STATUS_LABELS[row.status]}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Připravenost exportu
            </p>
            <p className={`mt-1 text-sm font-semibold ${overall.className}`}>
              {overall.text}
            </p>
          </div>
        </div>

        {exportResult ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Validace exportu
            </p>
            <ul className="max-h-48 space-y-2 overflow-y-auto" aria-label="Export validation checks">
              {exportResult.validationReport.rows.map((row) => (
                <ExportRowItem key={row.id} row={row} />
              ))}
            </ul>

            {exportSummary ? (
              <div className="mt-3 space-y-2 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Výsledek exportu
                  </p>
                  <span className={`text-sm font-bold ${exportSummary.className}`}>
                    {exportSummary.text}
                  </span>
                </div>

                {exportPassed ? (
                  <p className="text-xs text-zinc-400">
                    {downloadStarted
                      ? "ZIP stažen. Pokud se nestáhl, použijte Stáhnout znovu."
                      : "ZIP připraven. Použijte Stáhnout znovu, pokud se soubor neuložil."}
                  </p>
                ) : (
                  <p className="text-xs text-red-400" role="alert">
                    ZIP nebyl stažen — validace exportu selhala.
                  </p>
                )}

                <p className="font-mono text-xs text-zinc-400 break-all">
                  {exportResult.fileName}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatFileSize(exportResult.zipSize)} · {exportResult.fileCount}{" "}
                  {exportResult.fileCount === 1 ? "soubor" : "souborů"}
                </p>

                {exportResult.generatedFiles.length > 0 ? (
                  <ul className="space-y-1 border-t border-zinc-800/60 pt-2 text-xs text-zinc-500">
                    {exportResult.generatedFiles.map((file) => (
                      <li key={file.path} className="flex justify-between gap-2">
                        <span className="font-mono text-zinc-400">{file.path}</span>
                        <span>{formatFileSize(file.size)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-zinc-800/60 p-4">
        {hasUnsavedChanges ? (
          <p className="text-xs text-amber-400/90">
            Export používá aktuální hodnoty na plátně. Uložte projekt pro trvalé změny.
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleGenerateZip}
          disabled={exporting}
          className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? "Generuji ZIP…" : "Exportovat Sklik ZIP"}
        </button>

        {exportResult && exportPassed ? (
          <button
            type="button"
            onClick={handleDownloadAgain}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            Stáhnout ZIP znovu
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
          {copied ? "Odkaz zkopírován" : "Kopírovat odkaz na náhled"}
        </button>

        <Link
          href={`/preview/${state.shareId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
        >
          Otevřít veřejný náhled
        </Link>
      </div>
    </aside>
  );
}
