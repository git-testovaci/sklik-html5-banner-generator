"use client";

import type { BannerLayer, ParticleMode } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import { clampParticleCount } from "@/lib/animation/keyframe-utils";
import { updateBannerLayer } from "@/lib/animation/storyboard-utils";

interface ParticleLayerControlsProps {
  layer: BannerLayer;
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
}

const MODES: { value: ParticleMode; label: string }[] = [
  { value: "dust-to-clean", label: "Dust to clean" },
  { value: "floating-dots", label: "Floating dots" },
  { value: "air-flow", label: "Air flow" },
  { value: "sparkle", label: "Sparkle" },
];

export function ParticleLayerControls({
  layer,
  state,
  onUpdate,
}: ParticleLayerControlsProps) {
  function patch(p: Partial<BannerLayer>) {
    onUpdate(updateBannerLayer(state, layer.id, p));
  }

  return (
    <div className="space-y-2">
      <label className="block text-[10px] text-zinc-500">
        Mode
        <select
          value={layer.particleMode ?? "dust-to-clean"}
          onChange={(e) => patch({ particleMode: e.target.value as ParticleMode })}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-[10px] text-zinc-500">
        Count (max 40)
        <input
          type="number"
          min={4}
          max={40}
          value={layer.particleCount ?? 24}
          onChange={(e) => patch({ particleCount: clampParticleCount(Number(e.target.value)) })}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        />
      </label>
      <label className="block text-[10px] text-zinc-500">
        Speed
        <input
          type="range"
          min={0.2}
          max={2}
          step={0.1}
          value={layer.speed ?? 1}
          onChange={(e) => patch({ speed: Number(e.target.value) })}
          className="mt-1 w-full"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={layer.particleLoop ?? true}
          onChange={(e) => patch({ particleLoop: e.target.checked })}
        />
        Loop particles
      </label>
    </div>
  );
}
