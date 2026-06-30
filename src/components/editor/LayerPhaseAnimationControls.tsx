"use client";

import { useState } from "react";
import type { BannerLayer } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import {
  LOOP_UI_PRESETS,
  OUT_UI_PRESETS,
  inPresetsForLayer,
} from "@/lib/animation/layer-phase-presets";
import {
  clearLayerPhaseAnimation,
  getLayerAnimationPhases,
  isTextLayer,
  setLayerPhaseAnimation,
  updateLayerPhaseDuration,
} from "@/lib/animation/layer-phase-utils";
import { getActiveScene } from "@/lib/animation/storyboard-utils";

type PhaseTab = "in" | "out" | "loop";

interface LayerPhaseAnimationControlsProps {
  layer: BannerLayer;
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
}

const TAB_LABELS: Record<PhaseTab, string> = {
  in: "Dopředu",
  out: "Dozadu",
  loop: "Smyčka",
};

const PHASE_HINTS: Record<PhaseTab, string> = {
  in: "Jak se vrstva objeví na začátku bloku.",
  out: "Jak vrstva zmizí před koncem bloku.",
  loop: "Opakovaný pohyb během zobrazení vrstvy.",
};

export function LayerPhaseAnimationControls({
  layer,
  state,
  onUpdate,
}: LayerPhaseAnimationControlsProps) {
  const [tab, setTab] = useState<PhaseTab>("in");
  const scene = getActiveScene(state);
  if (!scene) return null;

  const phases = getLayerAnimationPhases(state, scene.id, layer.id);
  const phaseState = phases[tab];
  const presets =
    tab === "in"
      ? inPresetsForLayer(isTextLayer(layer))
      : tab === "out"
        ? OUT_UI_PRESETS
        : LOOP_UI_PRESETS;

  function applyPreset(uiPresetId: string) {
    onUpdate((prev) => setLayerPhaseAnimation(prev, scene!.id, layer.id, tab, uiPresetId));
  }

  function applyDuration(ms: number) {
    if (phaseState.uiPresetId === "none" || !phaseState.active) return;
    onUpdate(
      (prev) => updateLayerPhaseDuration(prev, scene!.id, layer.id, tab, ms),
      { history: "replace" },
    );
  }

  function resetPhase() {
    onUpdate((prev) => clearLayerPhaseAnimation(prev, scene!.id, layer.id, tab));
  }

  return (
    <div className="border-t border-zinc-800/60 pt-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Animace</p>
      <div className="mb-2 flex gap-1 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-0.5">
        {(["in", "out", "loop"] as PhaseTab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md px-2 py-1 text-[10px] ${
              tab === key
                ? "bg-violet-950/60 text-violet-200"
                : "text-zinc-500 hover:bg-zinc-800/50"
            }`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>
      <p className="mb-2 text-[10px] text-zinc-500">{PHASE_HINTS[tab]}</p>
      <div className="grid grid-cols-2 gap-1">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset.id)}
            className={`rounded border px-2 py-1.5 text-left text-[10px] ${
              phaseState.uiPresetId === preset.id
                ? "border-violet-600/60 bg-violet-950/40 text-violet-200"
                : "border-zinc-700/80 text-zinc-400 hover:bg-zinc-800/40"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {phaseState.active && tab !== "loop" ? (
        <div className="mt-2 space-y-1">
          <label className="text-[10px] text-zinc-500">
            Délka · {(phaseState.durationMs / 1000).toFixed(2)} s
          </label>
          <input
            type="range"
            min={100}
            max={Math.max(100, phases.rangeDurationMs - 100)}
            step={50}
            value={phaseState.durationMs}
            onChange={(e) => applyDuration(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
        </div>
      ) : null}
      {phaseState.active && tab === "loop" ? (
        <p className="mt-2 text-[10px] text-zinc-500">
          Smyčka běží po dobu zobrazení vrstvy (střed bloku).
        </p>
      ) : null}
      {phaseState.active ? (
        <button
          type="button"
          onClick={resetPhase}
          className="mt-2 text-[10px] text-zinc-500 hover:text-red-400 hover:underline"
        >
          Resetovat animaci
        </button>
      ) : null}
    </div>
  );
}
