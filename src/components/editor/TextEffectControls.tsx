"use client";

import type { BannerLayer } from "@/types/animation";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";
import { updateBannerLayer } from "@/lib/animation/storyboard-utils";

interface TextEffectControlsProps {
  layer: BannerLayer;
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
}

export function TextEffectControls({ layer, state, onUpdate }: TextEffectControlsProps) {
  function patch(p: Partial<BannerLayer>) {
    onUpdate(updateBannerLayer(state, layer.id, p));
  }

  return (
    <div className="space-y-2">
      <label className="block text-[10px] text-zinc-500">
        Text
        <textarea
          value={layer.text ?? ""}
          onChange={(e) => patch({ text: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] text-zinc-500">
          Font size
          <input
            type="number"
            value={layer.fontSize ?? 14}
            onChange={(e) => patch({ fontSize: Number(e.target.value) })}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          />
        </label>
        <label className="text-[10px] text-zinc-500">
          Align
          <select
            value={layer.textAlign ?? "left"}
            onChange={(e) =>
              patch({ textAlign: e.target.value as BannerLayer["textAlign"] })
            }
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
      </div>
      <label className="block text-[10px] text-zinc-500">
        Highlight word
        <input
          type="text"
          value={layer.highlightWord ?? ""}
          onChange={(e) => patch({ highlightWord: e.target.value || undefined })}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        />
      </label>
      <label className="block text-[10px] text-zinc-500">
        Underline word
        <input
          type="text"
          value={layer.underlineWord ?? ""}
          onChange={(e) => patch({ underlineWord: e.target.value || undefined })}
          className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={layer.persistent}
          onChange={(e) => patch({ persistent: e.target.checked })}
        />
        Persist across scenes
      </label>
    </div>
  );
}
