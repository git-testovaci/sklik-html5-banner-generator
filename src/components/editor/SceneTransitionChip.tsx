"use client";

import { SCENE_TRANSITIONS, type BannerScene, type BannerSceneTransition } from "@/types/animation";
import { getSceneTransitionDurationMs } from "@/lib/animation/storyboard-utils";
import { transitionFriendlyLabel } from "@/lib/animation/effect-labels";

interface SceneTransitionChipProps {
  scene: BannerScene;
  isLast: boolean;
  loopEnabled?: boolean;
  active?: boolean;
  onSelect: () => void;
  onChange: (transition: BannerSceneTransition) => void;
}

function transitionArrow(transition: BannerSceneTransition): string {
  switch (transition) {
    case "swipe-left":
    case "push-left":
      return "←";
    case "swipe-right":
    case "push-right":
      return "→";
    case "swipe-up":
      return "↑";
    case "swipe-down":
      return "↓";
    case "fade":
      return "◐";
    default:
      return "·";
  }
}

export function SceneTransitionChip({
  scene,
  isLast,
  loopEnabled = false,
  active = false,
  onSelect,
  onChange,
}: SceneTransitionChipProps) {
  if (isLast && !loopEnabled) {
    return <div className="w-3 shrink-0" aria-hidden />;
  }

  const durSec = (getSceneTransitionDurationMs(scene) / 1000).toFixed(1);
  const label = transitionFriendlyLabel(scene.transitionOut);

  return (
    <div className="flex shrink-0 flex-col items-center px-0.5">
      <button
        type="button"
        onClick={onSelect}
        className={`rounded-full border px-2 py-1 text-[9px] leading-tight transition-colors ${
          active
            ? "border-violet-500 bg-violet-950/50 text-violet-200"
            : "border-zinc-700 bg-zinc-900/80 text-zinc-400 hover:border-zinc-600"
        }`}
        title={`${label} · ${durSec}s`}
      >
        <span className="mr-0.5">{transitionArrow(scene.transitionOut)}</span>
        {label.split(" ")[0]} {durSec}s
      </button>
      <select
        value={scene.transitionOut}
        onChange={(e) => onChange(e.target.value as BannerSceneTransition)}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 max-w-[72px] truncate rounded border-0 bg-transparent text-[8px] text-zinc-600 outline-none"
        aria-label="Typ přechodu"
      >
        {SCENE_TRANSITIONS.map((t) => (
          <option key={t.value} value={t.value}>
            {transitionFriendlyLabel(t.value)}
          </option>
        ))}
      </select>
    </div>
  );
}
