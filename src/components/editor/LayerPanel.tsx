"use client";

import type { BannerAssetPlacement, TextLayerPlacement } from "@/types/assets";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import { LayerControls } from "./LayerControls";

type SelectableLayer =
  | { type: "text"; id: TextLayerPlacement["layerId"] }
  | { type: "asset"; id: string };

interface LayerPanelProps {
  state: BannerEditorState;
  selectedLayer: SelectableLayer;
  onSelectLayer: (layer: SelectableLayer) => void;
  onUpdate: BannerEditorStateUpdater;
}

const TEXT_LAYERS: { id: TextLayerPlacement["layerId"]; label: string }[] = [
  { id: "headline", label: "Headline" },
  { id: "subheadline", label: "Subheadline" },
  { id: "cta", label: "CTA" },
];

export function LayerPanel({
  state,
  selectedLayer,
  onSelectLayer,
  onUpdate,
}: LayerPanelProps) {
  function updateTextPlacement(
    layerId: TextLayerPlacement["layerId"],
    patch: Partial<TextLayerPlacement>,
  ) {
    onUpdate({
      textPlacements: (state.textPlacements ?? []).map((p) =>
        p.layerId === layerId ? { ...p, ...patch } : p,
      ),
    });
  }

  function updateAssetPlacement(assetId: string, patch: Partial<BannerAssetPlacement>) {
    onUpdate({
      assetPlacements: (state.assetPlacements ?? []).map((p) =>
        p.assetId === assetId ? { ...p, ...patch } : p,
      ),
    });
  }

  const selectedText =
    selectedLayer.type === "text"
      ? (state.textPlacements ?? []).find((p) => p.layerId === selectedLayer.id)
      : undefined;

  const selectedAsset =
    selectedLayer.type === "asset"
      ? (state.assetPlacements ?? []).find((p) => p.assetId === selectedLayer.id)
      : undefined;

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Layers</h2>
      </div>
      <div className="max-h-48 overflow-y-auto border-b border-zinc-800/60 p-2">
        <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-600">Text</p>
        {TEXT_LAYERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectLayer({ type: "text", id })}
            className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-xs ${
              selectedLayer.type === "text" && selectedLayer.id === id
                ? "bg-violet-950/50 text-violet-200"
                : "text-zinc-400 hover:bg-zinc-800/50"
            }`}
          >
            {label}
          </button>
        ))}
        {(state.assetPlacements ?? []).length > 0 ? (
          <>
            <p className="mt-2 px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-600">Images</p>
            {(state.assetPlacements ?? []).map((p) => {
              const asset = (state.assets ?? []).find((a) => a.id === p.assetId);
              return (
                <button
                  key={p.assetId}
                  type="button"
                  onClick={() => onSelectLayer({ type: "asset", id: p.assetId })}
                  className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-xs capitalize ${
                    selectedLayer.type === "asset" && selectedLayer.id === p.assetId
                      ? "bg-violet-950/50 text-violet-200"
                      : "text-zinc-400 hover:bg-zinc-800/50"
                  }`}
                >
                  {asset?.kind ?? p.kind} {!p.visible ? "(hidden)" : ""}
                </button>
              );
            })}
          </>
        ) : null}
      </div>
      <div className="p-4">
        {selectedText ? (
          <LayerControls
            label={selectedLayer.type === "text" ? selectedLayer.id : "layer"}
            visible={selectedText.visible}
            x={selectedText.x}
            y={selectedText.y}
            width={selectedText.width}
            height={selectedText.height}
            opacity={selectedText.opacity}
            rotation={selectedText.rotation}
            zIndex={selectedText.zIndex}
            onChange={(patch) =>
              updateTextPlacement(selectedLayer.id as TextLayerPlacement["layerId"], patch)
            }
          />
        ) : selectedAsset ? (
          <LayerControls
            label={selectedAsset.kind}
            visible={selectedAsset.visible}
            x={selectedAsset.x}
            y={selectedAsset.y}
            width={selectedAsset.width}
            height={selectedAsset.height}
            opacity={selectedAsset.opacity}
            rotation={selectedAsset.rotation}
            zIndex={selectedAsset.zIndex}
            fit={selectedAsset.fit}
            borderRadius={selectedAsset.borderRadius}
            shadow={selectedAsset.shadow}
            onChange={(patch) => updateAssetPlacement(selectedAsset.assetId, patch)}
          />
        ) : (
          <p className="text-xs text-zinc-500">Select a layer to edit placement.</p>
        )}
      </div>
    </section>
  );
}
