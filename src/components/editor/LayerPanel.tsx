"use client";

import type { TextLayerPlacement } from "@/types/assets";
import {
  centerHorizontally,
  centerVertically,
  clampPlacementToBanner,
  clampTextPlacementFields,
} from "@/lib/animation/timeline-utils";
import type { BannerEditorState, BannerEditorStateUpdater, SelectedLayer } from "@/types/editor";
import {
  getActiveScene,
  patchBannerLayerSlice,
  reorderLayerInScene,
  resolveBannerLayerForSelection,
} from "@/lib/animation/storyboard-utils";
import {
  getOrderedSceneLayersForUi,
  selectionForBannerLayer,
} from "@/lib/animation/layer-timeline-utils";
import {
  animationTargetIdForLayer,
  layerDisplayStackLabel,
} from "@/lib/animation/layer-instance-utils";
import { getLayerAnimation } from "@/lib/animation/timeline-utils";
import { LayerControls } from "./LayerControls";

interface LayerPanelProps {
  state: BannerEditorState;
  selectedLayer: SelectedLayer;
  onSelectLayer: (layer: SelectedLayer) => void;
  onUpdate: BannerEditorStateUpdater;
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
  const selectedBannerLayer = resolveBannerLayerForSelection(state, selectedLayer);

  function updateBannerLayerPatch(layerId: string, patch: Parameters<typeof patchBannerLayerSlice>[2]) {
    onUpdate(patchBannerLayerSlice(state, layerId, patch));
  }

  function applyZQuick(action: "front" | "back" | "fwd" | "backwd") {
    if (!activeScene || !selectedBannerLayer) return;
    const map = {
      front: "front",
      back: "back",
      fwd: "forward",
      backwd: "backward",
    } as const;
    onUpdate(
      reorderLayerInScene(state, activeScene.id, selectedBannerLayer.id, map[action]),
    );
  }

  function centerSelected(axis: "h" | "v" | "both") {
    if (!selectedBannerLayer) return;
    let patch = { x: selectedBannerLayer.x, y: selectedBannerLayer.y };
    if (axis === "h" || axis === "both") {
      patch = centerHorizontally(
        { ...selectedBannerLayer, ...patch },
        state.width,
      );
    }
    if (axis === "v" || axis === "both") {
      patch = centerVertically({ ...selectedBannerLayer, ...patch }, state.height);
    }
    updateBannerLayerPatch(selectedBannerLayer.id, patch);
  }

  function resetSelected() {
    if (!selectedBannerLayer) return;
    updateBannerLayerPatch(selectedBannerLayer.id, {
      visible: true,
      opacity: 1,
      rotation: 0,
    });
  }

  const selectedText =
    selectedLayer.type === "text"
      ? (state.textPlacements ?? []).find((p) => p.layerId === selectedLayer.id)
      : undefined;

  const selectedAsset =
    selectedLayer.type === "asset" && !selectedBannerLayer
      ? (state.assetPlacements ?? []).find((p) => p.assetId === selectedLayer.id)
      : undefined;

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="max-h-52 overflow-y-auto border-b border-zinc-800/60 p-2">
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
              animationTargetIdForLayer(layer, layer.id),
            );
            const animOn = anim?.enabled && anim.preset !== "none";
            const isSelected = selectedLayer.type === sel.type && selectedLayer.id === sel.id;
            const isFront = index === 0;
            const primary = layerDisplayStackLabel(layer, state);
            const asset = layer.assetId
              ? (state.assets ?? []).find((a) => a.id === layer.assetId)
              : undefined;
            const secondary =
              layer.type === "text" && layer.text
                ? null
                : asset && layer.name !== asset.fileName
                  ? asset.fileName
                  : null;

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
                      : layer.locked
                        ? "text-zinc-500 opacity-80 hover:bg-zinc-800/50"
                        : "text-zinc-400 hover:bg-zinc-800/50"
                }`}
              >
                <span className="block truncate">
                  {layer.locked ? "🔒 " : ""}
                  {primary}
                  {!layer.visible ? " · skryté" : ""}
                  {isFront ? " · popředí" : ""}
                  {animOn ? " · anim" : ""}
                </span>
                {secondary ? (
                  <span className="block truncate text-[10px] text-zinc-600">{secondary}</span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
      <div className="space-y-3 p-3">
        {selectedBannerLayer ? (
          <>
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
              <button
                type="button"
                onClick={() => centerSelected("h")}
                className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
              >
                Na střed ↔
              </button>
              <button
                type="button"
                onClick={() => centerSelected("v")}
                className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
              >
                Na střed ↕
              </button>
              <button
                type="button"
                onClick={resetSelected}
                className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
              >
                Resetovat
              </button>
            </div>
            <LayerControls
              label={selectedBannerLayer.name}
              visible={selectedBannerLayer.visible}
              x={selectedBannerLayer.x}
              y={selectedBannerLayer.y}
              width={selectedBannerLayer.width}
              height={selectedBannerLayer.height}
              opacity={selectedBannerLayer.opacity}
              rotation={selectedBannerLayer.rotation}
              zIndex={selectedBannerLayer.zIndex}
              fontSize={selectedBannerLayer.fontSize}
              textAlign={selectedBannerLayer.textAlign}
              fit={selectedBannerLayer.fit}
              borderRadius={selectedBannerLayer.borderRadius}
              shadow={selectedBannerLayer.shadow}
              onCenterH={() => centerSelected("h")}
              onCenterV={() => centerSelected("v")}
              onChange={(patch) => updateBannerLayerPatch(selectedBannerLayer.id, patch)}
            />
          </>
        ) : selectedText ? (
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
              onUpdate({
                textPlacements: (state.textPlacements ?? []).map((p) =>
                  p.layerId === selectedLayer.id
                    ? clampText({ ...p, ...patch }, state.width, state.height)
                    : p,
                ),
              })
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
            onChange={(patch) =>
              onUpdate({
                assetPlacements: (state.assetPlacements ?? []).map((p) => {
                  if (p.assetId !== selectedAsset.assetId) return p;
                  const merged = { ...p, ...patch };
                  const c = clampPlacementToBanner(merged, state.width, state.height);
                  return { ...merged, ...c };
                }),
              })
            }
          />
        ) : (
          <p className="text-xs text-zinc-500">Vyberte vrstvu pro úpravu pozice.</p>
        )}
      </div>
    </section>
  );
}
