"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyzeImportedBannerZip,
} from "@/lib/html5-import/analyze-imported-banner";
import {
  revokeBlobUrls,
  saveImportedBannerSession,
} from "@/lib/html5-import/imported-banner-storage";
import type { ImportedBannerAnalysis } from "@/types/imported-banner";
import { AnimationInsightsPanel } from "./AnimationInsights";
import { CreateProjectFromImportPanel } from "./CreateProjectFromImportPanel";
import { ImportAnalysisPanel } from "./ImportAnalysisPanel";
import { ImportDropzone } from "./ImportDropzone";
import { ImportedBannerPreview } from "./ImportedBannerPreview";
import { ImportedFilesList } from "./ImportedFilesList";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.round(bytes / 1024)} kB`;
}

export function ImportBannerClient() {
  const [analysis, setAnalysis] = useState<ImportedBannerAnalysis | null>(null);
  const [sourceZipFile, setSourceZipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blobUrls, setBlobUrls] = useState<string[]>([]);
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    blobUrlsRef.current = blobUrls;
  }, [blobUrls]);

  useEffect(() => {
    return () => {
      revokeBlobUrls(blobUrlsRef.current);
    };
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Nahrajte soubor .zip s HTML5 bannerem.");
      return;
    }

    setLoading(true);
    setError(null);
    revokeBlobUrls(blobUrlsRef.current);
    setBlobUrls([]);

    try {
      const result = await analyzeImportedBannerZip(file);
      setAnalysis(result);
      setSourceZipFile(file);
      setBlobUrls(result.previewBlobUrls);
      saveImportedBannerSession({ analysis: result, previewBlobUrls: [] });
    } catch (err) {
      setAnalysis(null);
      setSourceZipFile(null);
      setError(err instanceof Error ? err.message : "Import selhal.");
    } finally {
      setLoading(false);
    }
  }, []);

  const previewWidth = analysis?.dimensions?.width ?? 300;
  const previewHeight = analysis?.dimensions?.height ?? 250;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300">
              ← Zpět na přehled
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-zinc-100 sm:text-2xl">
              Import HTML5 banneru
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              Nahrajte existující HTML5 ZIP, prohlédněte strukturu a vytvořte z něj editovatelný projekt.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <aside
          aria-label="Upozornění k importu"
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400"
        >
          <p>
            Soubory se zpracovávají lokálně v prohlížeči — nic se nenahrává na server.
            Náhled běží v izolovaném iframe. Cloudové úložiště přibude později.
          </p>
        </aside>

        {!analysis ? (
          <ImportDropzone onFileSelected={handleFile} disabled={loading} error={error} />
        ) : null}

        {loading ? (
          <p className="text-center text-sm text-zinc-500">Analyzuji ZIP…</p>
        ) : null}

        {analysis ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-200">{analysis.fileName}</p>
                <p className="text-xs text-zinc-500">
                  {analysis.fileCount} souborů · {formatFileSize(analysis.compressedSize)} komprimováno
                  {" · "}
                  {formatFileSize(analysis.uncompressedSize)} nekomprimováno
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  revokeBlobUrls(blobUrls);
                  setBlobUrls([]);
                  setAnalysis(null);
                  setSourceZipFile(null);
                  setError(null);
                }}
                className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Importovat jiný ZIP
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-1">
                <ImportedFilesList files={analysis.files} />
                <ImportAnalysisPanel
                  rows={analysis.validationRows}
                  overallStatus={analysis.overallStatus}
                  sklikReadiness={analysis.sklikReadiness}
                  imageSummaries={analysis.imageSummaries ?? []}
                />
              </div>

              <div className="xl:col-span-1">
                <ImportedBannerPreview
                  previewHtml={analysis.previewHtml}
                  width={previewWidth}
                  height={previewHeight}
                  warning={analysis.previewWarning}
                />
              </div>

              <div className="space-y-6 xl:col-span-1">
                <AnimationInsightsPanel insights={analysis.animationInsights} />
                <CreateProjectFromImportPanel analysis={analysis} sourceZipFile={sourceZipFile} />
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
