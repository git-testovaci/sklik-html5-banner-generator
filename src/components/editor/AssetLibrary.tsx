"use client";

import { useEffect, useState } from "react";
import { buildAssetsMetaKey, loadPreviewAssetUrls } from "@/lib/assets/asset-storage";
import { formatFileSize } from "@/lib/assets/image-utils";
import {
  addMediaLayerAtPlayhead,
  applyLayerTimingAtPlayhead,
  assignAssetToSlotLayer,
  isSelectedEmptySlot,
  resolveLayerFromSelection,
  slotLayerSelection,
} from "@/lib/assets/slot-utils";
import { countLayerInstancesUsingAsset } from "@/lib/animation/layer-instance-utils";
import type { BannerAssetKind } from "@/types/assets";
import type { BannerEditorState, BannerEditorStateUpdater, SelectedLayer } from "@/types/editor";

interface AssetLibraryProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  selectedLayer?: SelectedLayer | null;
  onPlaced?: (selection: SelectedLayer, message: string) => void;
  scrubTimeMs?: number;
}

const KIND_LABELS: Record<BannerAssetKind, string> = {
  logo: "Logo",
  product: "Produkt",
  background: "Pozadí",
  decoration: "Obrázek",
};

function useThumbnails(metaKey: string) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!metaKey) return;
    let cancelled = false;
    void loadPreviewAssetUrls(metaKey).then((result) => {
      if (!cancelled) setUrls(result.urls);
    });
    return () => {
      cancelled = true;
    };
  }, [metaKey]);

  return metaKey ? urls : {};
}

function usageLabel(count: number): string {
  if (count === 0) return "Nepoužito";
  if (count === 1) return "Použito 1×";
  return `Použito ${count}×`;
}

export function AssetLibrary({
  state,
  onUpdate,
  selectedLayer,
  onPlaced,
  scrubTimeMs = 0,
}: AssetLibraryProps) {
  const assets = state.assets ?? [];
  const metaKey = buildAssetsMetaKey(assets);
  const urls = useThumbnails(metaKey);
  const hasStoryboard = (state.scenes ?? []).length > 0;
  const emptySlotSelected = isSelectedEmptySlot(state, selectedLayer ?? null);
  const selectedSlot = emptySlotSelected
    ? resolveLayerFromSelection(state, selectedLayer ?? null)
    : undefined;

  if (assets.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-6 text-center">
        <h2 className="text-sm font-medium text-zinc-400">Média</h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Nahrajte logo, produkt nebo obrázek. Potom ho můžete přidat na časovou osu jako vrstvu.
        </p>
      </section>
    );
  }

  function addToTimeline(assetId: string) {
    if (!hasStoryboard) return;
    const { state: next, layer } = addMediaLayerAtPlayhead(state, assetId, scrubTimeMs);
    onUpdate(next);
    onPlaced?.(slotLayerSelection(layer), `${layer.name} přidán na časovou osu`);
  }

  function insertIntoSelectedSlot(assetId: string) {
    if (!selectedSlot) return;
    let next = assignAssetToSlotLayer(state, selectedSlot.id, assetId);
    next = applyLayerTimingAtPlayhead(next, selectedSlot.id, scrubTimeMs);
    onUpdate(next);
    onPlaced?.(
      { type: "asset", id: selectedSlot.id },
      `${selectedSlot.name} — vloženo do vybraného místa`,
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Média</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Soubory v knihovně · přidejte je jako vrstvu na časovou osu
        </p>
      </div>
      <ul className="max-h-72 space-y-2 overflow-y-auto p-3">
        {assets.map((asset) => {
          const url = urls[asset.id];
          const usedCount = countLayerInstancesUsingAsset(state, asset.id);
          return (
            <li
              key={asset.id}
              className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-2.5"
            >
              <div className="flex gap-2.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-900 ring-1 ring-zinc-800/80">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-[9px] text-zinc-600">…</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-violet-300/90">
                    {KIND_LABELS[asset.kind]}
                  </p>
                  <p className="truncate text-xs font-medium text-zinc-200">{asset.fileName}</p>
                  <p className="text-[10px] text-zinc-600">
                    {asset.width}×{asset.height} · {formatFileSize(asset.size)}
                  </p>
                  <p className="mt-0.5">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-medium ${
                        usedCount === 0
                          ? "bg-zinc-800/80 text-zinc-500"
                          : "bg-violet-950/70 text-violet-300"
                      }`}
                    >
                      {usageLabel(usedCount)}
                    </span>
                  </p>
                </div>
              </div>
              {hasStoryboard ? (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => addToTimeline(asset.id)}
                    className="w-full rounded-md bg-violet-600 px-2 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-violet-500"
                  >
                    + Přidat na časovou osu
                  </button>
                  {emptySlotSelected && selectedSlot ? (
                    <button
                      type="button"
                      onClick={() => insertIntoSelectedSlot(asset.id)}
                      className="w-full rounded-md border border-violet-700/60 bg-violet-950/30 px-2 py-1.5 text-[10px] font-medium text-violet-200 hover:bg-violet-900/40"
                    >
                      Vložit do vybraného místa
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
