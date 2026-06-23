"use client";

import type { EffectPreset } from "@/types/animation";
import type {
  BannerEditorState,
  BannerEditorStateUpdater,
  SelectedLayer,
} from "@/types/editor";
import { QUICK_EFFECTS, sceneEffectToTransition } from "@/lib/animation/effect-presets";
import {
  addLayerEffect,
  addParticleLayer,
  addUnderlineLayer,
  clearSceneEffects,
  getActiveScene,
  getLayerById,
  selectedLayerToBannerLayerId,
  staggerProductLayers,
  updateScene,
} from "@/lib/animation/storyboard-utils";

interface MotionPresetQuickActionsProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
  selectedLayer: SelectedLayer;
  onSelectEffect: (effectId: string) => void;
}

export function MotionPresetQuickActions({
  state,
  onUpdate,
  selectedLayer,
  onSelectEffect,
}: MotionPresetQuickActionsProps) {
  const layerId = selectedLayerToBannerLayerId(state, selectedLayer);
  const layer = layerId ? getLayerById(state, layerId) : undefined;
  const scene = getActiveScene(state);

  function applyLayerPreset(preset: EffectPreset) {
    if (!layerId) return;
    const next = addLayerEffect(state, layerId, preset);
    const last = (next.layerEffects ?? [])[next.layerEffects!.length - 1];
    onUpdate(next);
    if (last) onSelectEffect(last.id);
  }

  function handleQuick(id: string, preset: EffectPreset, target: string) {
    if (target === "scene" && scene) {
      const transition = sceneEffectToTransition(preset);
      onUpdate(updateScene(state, scene.id, { transitionOut: transition }));
      return;
    }
    if (target === "products") {
      onUpdate(staggerProductLayers(state));
      return;
    }
    if (id === "underline") {
      onUpdate(addUnderlineLayer(state, layerId ?? undefined));
      return;
    }
    if (id === "particles") {
      onUpdate(addParticleLayer(state));
      return;
    }
    applyLayerPreset(preset);
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Quick motion</h2>
        <p className="text-[10px] text-zinc-500">
          {layer ? `Target: ${layer.name}` : "Select a layer for layer effects"}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 p-3">
        {QUICK_EFFECTS.map(({ id, label, preset, target }) => {
          const needsLayer = target === "layer" && id !== "particles" && id !== "underline";
          const disabled = needsLayer && !layerId;
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => handleQuick(id, preset, target)}
              className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onUpdate(clearSceneEffects(state))}
          className="rounded border border-red-900/50 px-2 py-1 text-[10px] text-red-400 hover:bg-red-950/30"
        >
          Clear animations
        </button>
      </div>
    </section>
  );
}
