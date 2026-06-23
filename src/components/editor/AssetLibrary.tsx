"use client";

import { formatFileSize } from "@/lib/assets/image-utils";
import type { BannerEditorState } from "@/types/editor";

interface AssetLibraryProps {
  state: BannerEditorState;
}

export function AssetLibrary({ state }: AssetLibraryProps) {
  if ((state.assets ?? []).length === 0) {
    return (
      <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Asset library</h2>
        <p className="mt-1 text-xs text-zinc-500">No images uploaded yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Asset library</h2>
        <p className="mt-1 text-xs text-zinc-500">{(state.assets ?? []).length} image(s) in project</p>
      </div>
      <ul className="max-h-40 space-y-2 overflow-y-auto p-4">
        {(state.assets ?? []).map((asset) => (
          <li
            key={asset.id}
            className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-2 text-xs"
          >
            <p className="font-medium capitalize text-zinc-300">{asset.kind}</p>
            <p className="truncate text-zinc-500">{asset.fileName}</p>
            <p className="text-zinc-600">
              {asset.width}×{asset.height} · {formatFileSize(asset.size)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
