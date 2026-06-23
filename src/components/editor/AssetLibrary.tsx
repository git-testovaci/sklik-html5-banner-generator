"use client";

import { useEffect, useState } from "react";
import { buildAssetsMetaKey, loadPreviewAssetUrls } from "@/lib/assets/asset-storage";
import { formatFileSize } from "@/lib/assets/image-utils";
import {
  insertImageLayerInScene,
  isSelectedSlotLayer,
  placeAssetInSlot,
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

function slotActionLabel(kind: BannerAssetKind): string {
  if (kind === "logo") return "Použít jako logo";
  if (kind === "product") return "Použít jako produkt";
  if (kind === "background") return "Použít jako pozadí";
  return "Použít v banneru";
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
  const canReplaceSlot = isSelectedSlotLayer(state, selectedLayer ?? null);

  if (assets.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-6 text-center">
        <p className="text-xs text-zinc-500">Zatím žádné assety — nahrajte logo nebo produkt výše.</p>
      </section>
    );
  }

  function updatePlacement(assetId: string, patch: Partial<BannerAssetPlacement>) {
    onUpdate({
      assetPlacements: (state.assetPlacements ?? []).map((p) =>
        p.assetId === assetId ? { ...p, ...patch } : p,
      ),
    });
  }

  function placeInSlot(assetId: string, kind: BannerAssetKind) {
    if (!hasStoryboard) return;
    const selectedId =
      selectedLayer?.type === "asset" ? selectedLayer.id : undefined;
    const result = placeAssetInSlot(state, assetId, kind, {
      selectedLayerId: selectedId,
      activeSceneId: state.activeSceneId,
      allowFilled: kind === "logo",
    });
    if (result.layerId) {
      onUpdate(result.state);
      onPlaced?.(
        { type: "asset", id: result.layerId },
        result.message,
      );
    } else {
      onPlaced?.({ type: "asset", id: assetId }, result.message);
    }
  }

  function insertIntoScene(assetId: string) {
    const asset = assets.find((a) => a.id === assetId);
    const name = asset ? KIND_LABELS[asset.kind] ?? "Obrázek" : "Obrázek";
    const { state: next, layer } = insertImageLayerInScene(state, assetId, name);
    onUpdate(next);
    onPlaced?.(slotLayerSelection(layer), `${name} vložen do scény`);
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
        <p className="mt-1 text-xs text-zinc-500">{assets.length} obrázků · klikněte pro vložení</p>
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
                  <p className="font-medium text-zinc-300">{KIND_LABELS[asset.kind]}</p>
                  <p className="truncate text-zinc-500">{asset.fileName}</p>
                  <p className="text-zinc-600">
                    {asset.width}×{asset.height} · {formatFileSize(asset.size)}
                  </p>
                </div>
              </div>
              {hasStoryboard ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => placeInSlot(asset.id, asset.kind === "decoration" ? "decoration" : asset.kind)}
                    className="rounded border border-violet-800/60 bg-violet-950/30 px-2 py-0.5 text-[10px] text-violet-200"
                  >
                    {slotActionLabel(asset.kind)}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertIntoScene(asset.id)}
                    className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
                  >
                    Vložit do aktuální scény
                  </button>
                  <button
                    type="button"
                    disabled={!canReplaceSlot}
                    title={
                      canReplaceSlot
                        ? "Nahradí vybraný slot"
                        : "Nejdříve vyberte slot na plátně"
                    }
                    onClick={() => {
                      const slot = resolveLayerFromSelection(state, selectedLayer ?? null);
                      if (!slot) return;
                      const result = placeAssetInSlot(state, asset.id, asset.kind, {
                        selectedLayerId: slot.id,
                        allowFilled: true,
                      });
                      if (result.layerId) {
                        onUpdate(result.state);
                        onPlaced?.({ type: "asset", id: result.layerId }, "Slot nahrazen");
                      }
                    }}
                    className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Nahradit vybraný slot
                  </button>
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
