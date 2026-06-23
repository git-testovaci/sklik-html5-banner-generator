"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collectAssetBlobWarnings,
  collectAssetMetadataWarnings,
  type AssetWarningItem,
} from "@/lib/assets/asset-validation";
import type { BannerEditorState } from "@/types/editor";

interface AssetWarningsPanelProps {
  state: BannerEditorState;
}

const LEVEL_STYLES = {
  info: "border-zinc-700/60 bg-zinc-950/40 text-zinc-400",
  warn: "border-amber-900/40 bg-amber-950/20 text-amber-200",
  fail: "border-red-900/40 bg-red-950/20 text-red-300",
};

export function AssetWarningsPanel({ state }: AssetWarningsPanelProps) {
  const visibleAssetIds = useMemo(
    () =>
      (state.assetPlacements ?? [])
        .filter((p) => p.visible)
        .map((p) => p.assetId)
        .sort()
        .join(","),
    [state.assetPlacements],
  );

  const [blobSnapshot, setBlobSnapshot] = useState<{
    key: string;
    warnings: AssetWarningItem[];
  }>({ key: "", warnings: [] });

  useEffect(() => {
    if (!visibleAssetIds) return;

    let cancelled = false;
    const ids = visibleAssetIds.split(",").filter(Boolean);

    void collectAssetBlobWarnings(ids).then((items) => {
      if (!cancelled) {
        setBlobSnapshot({ key: visibleAssetIds, warnings: items });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [visibleAssetIds]);

  const warnings = useMemo(() => {
    const metadata = collectAssetMetadataWarnings(state);
    if (!visibleAssetIds) return metadata;
    const blobWarnings =
      blobSnapshot.key === visibleAssetIds ? blobSnapshot.warnings : [];
    return [...metadata, ...blobWarnings];
  }, [state, visibleAssetIds, blobSnapshot]);

  const loading = visibleAssetIds.length > 0 && blobSnapshot.key !== visibleAssetIds;

  if (loading && warnings.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
        <p className="text-xs text-zinc-500">Checking assets…</p>
      </section>
    );
  }

  if (warnings.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Asset checks</h2>
        <p className="mt-1 text-xs text-emerald-400/90">No asset issues detected.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Asset checks</h2>
      </div>
      <ul className="space-y-2 p-3">
        {warnings.map((w) => (
          <li
            key={w.id}
            className={`rounded-lg border px-3 py-2 text-xs ${LEVEL_STYLES[w.level]}`}
          >
            {w.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
