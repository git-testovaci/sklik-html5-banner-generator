"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  removeLayerFromEditor,
  resolveBannerLayerForSelection,
} from "@/lib/animation/storyboard-utils";
import {
  getOrderedSceneLayersForUi,
  moveLayerInSceneStack,
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
  onDuplicateLayer?: (layerId: string) => void;
  onDeleteLayer?: (layerId: string) => void;
}

function clampText(p: TextLayerPlacement, w: number, h: number): TextLayerPlacement {
  return clampTextPlacementFields(p, w, h);
}

export function LayerPanel({
  state,
  selectedLayer,
  onSelectLayer,
  onUpdate,
  onDuplicateLayer,
  onDeleteLayer,
}: LayerPanelProps) {
  const activeScene = getActiveScene(state);
  const orderedLayers = activeScene
    ? getOrderedSceneLayersForUi(state, activeScene.id)
    : [];
  const selectedBannerLayer = resolveBannerLayerForSelection(state, selectedLayer);
  const listRef = useRef<HTMLDivElement>(null);
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);

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
      patch = centerHorizontally({ ...selectedBannerLayer, ...patch }, state.width);
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

  function handleDelete(layerId: string) {
    if (onDeleteLayer) {
      onDeleteLayer(layerId);
      return;
    }
    onUpdate(removeLayerFromEditor(state, layerId));
  }

  const resolveDropIndex = useCallback((clientY: number): number => {
    const rows = listRef.current?.querySelectorAll("[data-layer-row]");
    if (!rows || rows.length === 0) return 0;
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i]!.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return rows.length - 1;
  }, []);

  useEffect(() => {
    if (!dragLayerId || !activeScene) return;

    function onMove(e: PointerEvent) {
      const idx = resolveDropIndex(e.clientY);
      dropIndexRef.current = idx;
      setDropIndex(idx);
    }

    function onUp() {
      const targetIdx = dropIndexRef.current;
      if (dragLayerId != null && targetIdx != null) {
        onUpdate(moveLayerInSceneStack(state, activeScene!.id, dragLayerId, targetIdx));
      }
      setDragLayerId(null);
      setDropIndex(null);
      dropIndexRef.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragLayerId, activeScene, state, onUpdate, resolveDropIndex]);

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
      <div ref={listRef} className="max-h-60 overflow-y-auto border-b border-zinc-800/60 p-2">
        <p className="px-2 py-1.5 text-sm font-medium text-zinc-300">Vrstvy</p>
        <p className="px-2 pb-1 text-[10px] text-zinc-600">
          Vpředu nahoře · táhněte ⋮⋮ pro přeskupení
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
            const isDragging = dragLayerId === layer.id;
            const isDropTarget = dropIndex === index && dragLayerId && dragLayerId !== layer.id;

            return (
              <div
                key={layer.id}
                data-layer-row
                className={`mb-1 flex items-stretch gap-0.5 rounded-lg ring-1 ring-transparent ${
                  isSelected ? "bg-violet-950/50 ring-violet-800/50" : ""
                } ${isDropTarget ? "ring-violet-500/60" : ""} ${isDragging ? "opacity-40" : ""} ${
                  !layer.visible ? "opacity-50" : ""
                }`}
              >
                <button
                  type="button"
                  className="flex w-5 shrink-0 cursor-grab items-center justify-center text-[10px] text-zinc-600 hover:text-zinc-400 active:cursor-grabbing"
                  title="Přetáhnout pořadí"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setDragLayerId(layer.id);
                    setDropIndex(index);
                    onSelectLayer(sel);
                  }}
                >
                  ⋮⋮
                </button>
                <button
                  type="button"
                  onClick={() => onSelectLayer(sel)}
                  className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-xs ${
                    isSelected
                      ? "text-violet-200"
                      : layer.locked
                        ? "text-zinc-500"
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
                <div className="flex shrink-0 items-center gap-0.5 pr-1">
                  {onDuplicateLayer && !layer.persistent ? (
                    <button
                      type="button"
                      title="Duplikovat"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateLayer(layer.id);
                      }}
                      className="rounded px-1 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                    >
                      ⧉
                    </button>
                  ) : null}
                  <button
                    type="button"
                    title={layer.visible ? "Skrýt" : "Zobrazit"}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateBannerLayerPatch(layer.id, { visible: !layer.visible });
                    }}
                    className="rounded px-1 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    {layer.visible ? "👁" : "👁‍🗨"}
                  </button>
                  <button
                    type="button"
                    title={layer.locked ? "Odemknout" : "Zamknout"}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateBannerLayerPatch(layer.id, { locked: !layer.locked });
                    }}
                    className="rounded px-1 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    {layer.locked ? "🔓" : "🔒"}
                  </button>
                  <button
                    type="button"
                    title="Smazat"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(layer.id);
                    }}
                    className="rounded px-1 py-0.5 text-[10px] text-red-500/80 hover:bg-red-950/40 hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              </div>
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
              {onDuplicateLayer && !selectedBannerLayer.persistent ? (
                <button
                  type="button"
                  onClick={() => onDuplicateLayer(selectedBannerLayer.id)}
                  className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
                >
                  Duplikovat
                </button>
              ) : null}
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
