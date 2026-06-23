"use client";

import { useEffect, useState } from "react";
import { buildAssetsMetaKey, loadPreviewAssetUrls } from "@/lib/assets/asset-storage";
import { formatFileSize } from "@/lib/assets/image-utils";
import {
  assignAssetToSlotLayer,
  findEmptySlotForKind,
  resolveLayerFromSelection,
  slotLayerSelection,
} from "@/lib/assets/slot-utils";
import {
  assetAtCorner,
  centerHorizontally,
  centerVertically,
  createDefaultAssetPlacement,
  fitBackgroundPlacement,
} from "@/lib/animation/timeline-utils";
import type { BannerAssetKind, BannerAssetPlacement } from "@/types/assets";
import type { BannerEditorState, BannerEditorStateUpdater, SelectedLayer } from "@/types/editor";

interface AssetLibraryProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  selectedLayer?: SelectedLayer | null;
  onPlaced?: (selection: SelectedLayer, message: string) => void;
}

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

export function AssetLibrary({
  state,
  onUpdate,
  selectedLayer,
  onPlaced,
}: AssetLibraryProps) {
  const assets = state.assets ?? [];
  const metaKey = buildAssetsMetaKey(assets);
  const urls = useThumbnails(metaKey);
  const hasStoryboard = (state.scenes ?? []).length > 0;

  if (assets.length === 0) return null;

  function updatePlacement(assetId: string, patch: Partial<BannerAssetPlacement>) {
    onUpdate({
      assetPlacements: (state.assetPlacements ?? []).map((p) =>
        p.assetId === assetId ? { ...p, ...patch } : p,
      ),
    });
  }

  function placeInSlot(assetId: string, kind: BannerAssetKind) {
    if (!hasStoryboard) return;
    const selectedSlot = resolveLayerFromSelection(state, selectedLayer ?? null);
    const slot =
      (selectedSlot && (selectedSlot.isTemplateSlot || selectedSlot.type === "image" || selectedSlot.type === "badge")
        ? selectedSlot
        : undefined) ??
      findEmptySlotForKind(state, kind === "decoration" ? "image" : kind);
    if (!slot) return;
    const next = assignAssetToSlotLayer(state, slot.id, assetId);
    onUpdate(next);
    onPlaced?.(slotLayerSelection(slot), "Použito v banneru");
  }

  function quickPlace(assetId: string, kind: BannerAssetKind, corner: Parameters<typeof assetAtCorner>[2]) {
    const asset = assets.find((a) => a.id === assetId);
    const placement = (state.assetPlacements ?? []).find((p) => p.assetId === assetId);
    if (!asset || !placement) return;
    const next = assetAtCorner(
      assetId,
      kind,
      corner,
      placement.width,
      placement.height,
      state.width,
      state.height,
      placement.zIndex,
    );
    updatePlacement(assetId, next);
  }

  function fitBackground(assetId: string) {
    updatePlacement(assetId, fitBackgroundPlacement(assetId, state.width, state.height));
  }

  function resetPlacement(assetId: string, kind: BannerAssetKind) {
    updatePlacement(assetId, createDefaultAssetPlacement(assetId, kind, state.width, state.height));
  }

  function centerAsset(assetId: string) {
    const p = (state.assetPlacements ?? []).find((x) => x.assetId === assetId);
    if (!p) return;
    let next = centerHorizontally(p, state.width);
    next = centerVertically(next, state.height);
    updatePlacement(assetId, next);
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Knihovna assetů</h2>
        <p className="mt-1 text-xs text-zinc-500">{assets.length} obrázků</p>
      </div>
      <ul className="max-h-64 space-y-3 overflow-y-auto p-3">
        {assets.map((asset) => {
          const url = urls[asset.id];
          const placement = (state.assetPlacements ?? []).find((p) => p.assetId === asset.id);
          return (
            <li
              key={asset.id}
              className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-2"
            >
              <div className="flex gap-2">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-900">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-[9px] text-zinc-600">…</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <p className="font-medium capitalize text-zinc-300">{asset.kind}</p>
                  <p className="truncate text-zinc-500">{asset.fileName}</p>
                  <p className="text-zinc-600">
                    {asset.width}×{asset.height} · {formatFileSize(asset.size)}
                  </p>
                </div>
              </div>
              {hasStoryboard ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {asset.kind === "logo" ? (
                    <button
                      type="button"
                      onClick={() => placeInSlot(asset.id, "logo")}
                      className="rounded border border-violet-800/60 bg-violet-950/30 px-2 py-0.5 text-[10px] text-violet-200"
                    >
                      Použít jako logo
                    </button>
                  ) : null}
                  {asset.kind === "product" ? (
                    <button
                      type="button"
                      onClick={() => placeInSlot(asset.id, "product")}
                      className="rounded border border-violet-800/60 bg-violet-950/30 px-2 py-0.5 text-[10px] text-violet-200"
                    >
                      Použít jako produkt
                    </button>
                  ) : null}
                  {asset.kind === "background" ? (
                    <button
                      type="button"
                      onClick={() => placeInSlot(asset.id, "background")}
                      className="rounded border border-violet-800/60 bg-violet-950/30 px-2 py-0.5 text-[10px] text-violet-200"
                    >
                      Použít jako pozadí
                    </button>
                  ) : null}
                  {selectedLayer?.type === "asset" ? (
                    <button
                      type="button"
                      onClick={() => placeInSlot(asset.id, asset.kind)}
                      className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
                    >
                      Nahradit vybraný slot
                    </button>
                  ) : null}
                </div>
              ) : null}
              {placement && asset.kind !== "decoration" && !hasStoryboard ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {asset.kind === "background" ? (
                    <button
                      type="button"
                      onClick={() => fitBackground(asset.id)}
                      className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
                    >
                      Vyplnit banner
                    </button>
                  ) : (
                    (["top-left", "top-right", "center", "bottom-left", "bottom-right"] as const).map(
                      (c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => quickPlace(asset.id, asset.kind, c)}
                          className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800"
                        >
                          {c.replace("-", " ")}
                        </button>
                      ),
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => centerAsset(asset.id)}
                    className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
                  >
                    Vycentrovat
                  </button>
                  <button
                    type="button"
                    onClick={() => resetPlacement(asset.id, asset.kind)}
                    className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
                  >
                    Reset
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
