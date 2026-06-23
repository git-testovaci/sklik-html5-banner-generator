"use client";

import type { BannerAssetPlacement, TextLayerPlacement } from "@/types/assets";
import {
  centerHorizontally,
  centerVertically,
  clampPlacementToBanner,
  clampTextPlacementFields,
  createDefaultAssetPlacement,
  getLayerAnimation,
} from "@/lib/animation/timeline-utils";
import type { BannerEditorState, BannerEditorStateUpdater, SelectedLayer } from "@/types/editor";
import { getActiveScene } from "@/lib/animation/storyboard-utils";
import {
  getOrderedSceneLayersForUi,
  layerTimelineLabel,
  selectionForBannerLayer,
} from "@/lib/animation/layer-timeline-utils";
import { LayerControls } from "./LayerControls";

interface LayerPanelProps {
  state: BannerEditorState;
  selectedLayer: SelectedLayer;
  onSelectLayer: (layer: SelectedLayer) => void;
  onUpdate: BannerEditorStateUpdater;
}

const TEXT_LAYERS: { id: TextLayerPlacement["layerId"]; label: string }[] = [
  { id: "headline", label: "Nadpis" },
  { id: "subheadline", label: "Podnadpis" },
  { id: "cta", label: "Výzva k akci" },
];

function layerListLabel(layer: ReturnType<typeof getOrderedSceneLayersForUi>[number]): string {
  const legacy = TEXT_LAYERS.find((t) => t.id === layer.legacyKey);
  if (legacy) return legacy.label;
  return layerTimelineLabel(layer);
}

function clampText(p: TextLayerPlacement, w: number, h: number): TextLayerPlacement {
  return clampTextPlacementFields(p, w, h);
}

export function LayerPanel({
  state,
  selectedLayer,
  onSelectLayer,
  onUpdate,
}: LayerPanelProps) {
  const activeScene = getActiveScene(state);
  const orderedLayers = activeScene
    ? getOrderedSceneLayersForUi(state, activeScene.id)
    : [];
  const topZ = orderedLayers.length ? orderedLayers[0]!.zIndex : 0;

  const allZ = [
    ...(state.textPlacements ?? []).map((p) => p.zIndex),
    ...(state.assetPlacements ?? []).map((p) => p.zIndex),
  ];
  const minZ = allZ.length ? Math.min(...allZ) : 1;
  const maxZ = allZ.length ? Math.max(...allZ) : 40;

  function updateTextPlacement(
    layerId: TextLayerPlacement["layerId"],
    patch: Partial<TextLayerPlacement>,
  ) {
    onUpdate({
      textPlacements: (state.textPlacements ?? []).map((p) =>
        p.layerId === layerId ? clampText({ ...p, ...patch }, state.width, state.height) : p,
      ),
    });
  }

  function updateAssetPlacement(assetId: string, patch: Partial<BannerAssetPlacement>) {
    onUpdate({
      assetPlacements: (state.assetPlacements ?? []).map((p) => {
        if (p.assetId !== assetId) return p;
        const merged = { ...p, ...patch };
        const c = clampPlacementToBanner(merged, state.width, state.height);
        return { ...merged, ...c };
      }),
    });
  }

  function bumpZ(current: number, delta: number): number {
    return Math.min(99, Math.max(1, current + delta));
  }

  function applyZQuick(action: "front" | "back" | "fwd" | "backwd") {
    if (selectedLayer.type === "text") {
      const p = (state.textPlacements ?? []).find((x) => x.layerId === selectedLayer.id);
      if (!p) return;
      const z =
        action === "front" ? maxZ + 1 : action === "back" ? minZ - 1 : action === "fwd" ? bumpZ(p.zIndex, 1) : bumpZ(p.zIndex, -1);
      updateTextPlacement(selectedLayer.id, { zIndex: Math.min(99, Math.max(1, z)) });
    } else {
      const p = (state.assetPlacements ?? []).find((x) => x.assetId === selectedLayer.id);
      if (!p) return;
      const z =
        action === "front" ? maxZ + 1 : action === "back" ? minZ - 1 : action === "fwd" ? bumpZ(p.zIndex, 1) : bumpZ(p.zIndex, -1);
      updateAssetPlacement(selectedLayer.id, { zIndex: Math.min(99, Math.max(1, z)) });
    }
  }

  function centerSelected(axis: "h" | "v" | "both") {
    if (selectedLayer.type === "text") {
      const p = (state.textPlacements ?? []).find((x) => x.layerId === selectedLayer.id);
      if (!p) return;
      let next = p;
      if (axis === "h" || axis === "both") next = centerHorizontally(next, state.width);
      if (axis === "v" || axis === "both") next = centerVertically(next, state.height);
      updateTextPlacement(selectedLayer.id, next);
    } else {
      const p = (state.assetPlacements ?? []).find((x) => x.assetId === selectedLayer.id);
      if (!p) return;
      let next = p;
      if (axis === "h" || axis === "both") next = centerHorizontally(next, state.width);
      if (axis === "v" || axis === "both") next = centerVertically(next, state.height);
      updateAssetPlacement(selectedLayer.id, next);
    }
  }

  function resetSelected() {
    if (selectedLayer.type === "text") {
      const defaults = (state.textPlacements ?? []).find((p) => p.layerId === selectedLayer.id);
      if (defaults) {
        updateTextPlacement(selectedLayer.id, {
          visible: true,
          opacity: 1,
          rotation: 0,
        });
      }
    } else {
      const asset = (state.assets ?? []).find((a) => a.id === selectedLayer.id);
      if (!asset) return;
      updateAssetPlacement(
        selectedLayer.id,
        createDefaultAssetPlacement(asset.id, asset.kind, state.width, state.height),
      );
    }
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
      <div className="max-h-44 overflow-y-auto border-b border-zinc-800/60 p-2">
        <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-600">
          Vrstvy ve scéně · vpředu nahoře
        </p>
        {orderedLayers.length === 0 ? (
          <p className="px-2 py-1 text-[10px] text-zinc-600">Ve scéně zatím nejsou vrstvy</p>
        ) : (
          orderedLayers.map((layer, index) => {
            const sel = selectionForBannerLayer(layer);
            const anim = getLayerAnimation(
              state,
              layer.legacyKey ?? (layer.assetId ? layer.assetId : layer.id),
            );
            const animOn = anim?.enabled && anim.preset !== "none";
            const isSelected = selectedLayer.type === sel.type && selectedLayer.id === sel.id;
            const isFront = index === 0;
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => onSelectLayer(sel)}
                className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-xs ring-1 ring-transparent ${
                  isSelected
                    ? "bg-violet-950/50 text-violet-200 ring-violet-800/50"
                    : !layer.visible
                      ? "text-zinc-600 opacity-50 hover:bg-zinc-800/50"
                      : "text-zinc-400 hover:bg-zinc-800/50"
                }`}
              >
                {layer.locked ? "🔒 " : ""}
                {layerListLabel(layer)}
                {!layer.visible ? " · skryté" : ""}
                {isFront ? " · popředí" : ""}
                {layer.zIndex === topZ && !isFront ? "" : !isFront ? ` · z${layer.zIndex}` : ""}
                {animOn ? " · anim" : ""}
              </button>
            );
          })
        )}
      </div>
      <div className="space-y-3 p-3">
        {(selectedText || selectedAsset) && (
          <div className="flex flex-wrap gap-1">
            {(["fwd", "backwd", "front", "back"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() =>
                  applyZQuick(a === "fwd" ? "fwd" : a === "backwd" ? "backwd" : a)
                }
                className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
              >
                {a === "fwd" ? "↑" : a === "backwd" ? "↓" : a === "front" ? "Vpřed" : "Dozadu"}
              </button>
            ))}
            <button type="button" onClick={() => centerSelected("h")} className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800">Na střed ↔</button>
            <button type="button" onClick={() => centerSelected("v")} className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800">Na střed ↕</button>
            <button type="button" onClick={resetSelected} className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800">Resetovat</button>
          </div>
        )}
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
            fontSize={selectedText.fontSize}
            textAlign={selectedText.textAlign}
            onCenterH={() => centerSelected("h")}
            onCenterV={() => centerSelected("v")}
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
          <p className="text-xs text-zinc-500">Vyberte vrstvu pro úpravu pozice.</p>
        )}
        {(state.bannerLayers ?? []).length > 0 &&
        (state.assetPlacements ?? []).length === 0 &&
        !(state.textPlacements ?? []).some((p) => p.visible) ? (
          <p className="text-[10px] text-zinc-600">
            Otevřete záložku Šablony pro storyboard, nebo nahrajte obrázky v Assety.
          </p>
        ) : null}
      </div>
    </section>
  );
}
