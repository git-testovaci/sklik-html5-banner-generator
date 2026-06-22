"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { loadImportedBannerSession } from "@/lib/html5-import/imported-banner-storage";
import { ImportedBannerPreview } from "@/components/import/ImportedBannerPreview";

function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function ImportedPreviewPage() {
  const isClient = useIsClient();
  const session = isClient ? loadImportedBannerSession() : null;
  const analysis = session?.analysis ?? null;

  if (!isClient) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-100">No imported banner in session</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-500">
          Import a ZIP on the import page first. Session data is stored temporarily in your browser.
        </p>
        <Link
          href="/import"
          className="mt-6 inline-flex rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Go to import
        </Link>
      </div>
    );
  }

  const width = analysis.dimensions?.width ?? 300;
  const height = analysis.dimensions?.height ?? 250;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/import" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Back to import
      </Link>
      <h1 className="mt-4 text-lg font-semibold text-zinc-100">{analysis.fileName}</h1>
      <div className="mt-6">
        <ImportedBannerPreview
          previewHtml={analysis.previewHtml}
          width={width}
          height={height}
          warning={analysis.previewWarning}
        />
      </div>
    </div>
  );
}
