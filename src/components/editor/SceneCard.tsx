"use client";

import type { BannerScene } from "@/types/animation";
import { getSceneTransitionDurationMs } from "@/lib/animation/storyboard-utils";
import { transitionFriendlyLabel } from "@/lib/animation/effect-labels";

interface SceneCardProps {
  scene: BannerScene;
  index: number;
  active: boolean;
  onSelect: () => void;
}

export function SceneCard({ scene, index, active, onSelect }: SceneCardProps) {
  const durSec = (scene.durationMs / 1000).toFixed(1);
  const transSec = (getSceneTransitionDurationMs(scene) / 1000).toFixed(1);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-w-[120px] shrink-0 rounded-lg border px-3 py-2 text-left transition-colors ${
        active
          ? "border-violet-500 bg-violet-950/40 ring-1 ring-violet-500/50"
          : "border-zinc-700 bg-zinc-900/60 hover:border-zinc-600"
      }`}
    >
      <p className="text-xs font-medium text-zinc-200">
        {index + 1}. {scene.name}
      </p>
      <p className="mt-0.5 text-[10px] text-zinc-500">
        {durSec} s · {transitionFriendlyLabel(scene.transitionOut)} {transSec}s
      </p>
      <p className="mt-1 text-[9px] uppercase tracking-wide text-zinc-600">
        {scene.layerIds.length} vrstev
      </p>
    </button>
  );
}
