"use client";

import { useCallback, useState } from "react";
import {
  deleteAssetBlob,
  invalidateAssetObjectUrl,
  saveAssetBlob,
} from "@/lib/assets/asset-storage";
import {
  compressImageIfNeeded,
  formatFileSize,
  readImageDimensions,
  resolveMimeType,
  validateImageFile,
} from "@/lib/assets/image-utils";
import { createDefaultAssetPlacement } from "@/lib/animation/timeline-utils";
import type { BannerAssetKind } from "@/types/assets";
import type { BannerEditorState, BannerEditorStateUpdater } from "@/types/editor";

interface AssetUploadPanelProps {
  state: BannerEditorState;
  onUpdate: BannerEditorStateUpdater;
}

const UPLOAD_SLOTS: { kind: BannerAssetKind; label: string; id: string }[] = [
  { kind: "logo", label: "Logo", id: "upload-logo" },
  { kind: "product", label: "Product image", id: "upload-product" },
  { kind: "background", label: "Background image", id: "upload-background" },
  { kind: "decoration", label: "Decoration", id: "upload-decoration" },
];

export function AssetUploadPanel({ state, onUpdate }: AssetUploadPanelProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (kind: BannerAssetKind, file: File) => {
      setErrors((prev) => ({ ...prev, [kind]: "" }));
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setErrors((prev) => ({ ...prev, [kind]: validation.message }));
        return;
      }

      setLoading(kind);
      try {
        const { blob, compressed } = await compressImageIfNeeded(file);
        const mimeType = compressed && blob.type ? blob.type : resolveMimeType(file);
        const dims = await readImageDimensions(blob);
        if (!dims && mimeType !== "image/svg+xml") {
          setErrors((prev) => ({
            ...prev,
            [kind]: "Could not read image. Try another file or format.",
          }));
          return;
        }
        const assetId = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        const saveResult = await saveAssetBlob(assetId, blob);
        if (!saveResult.ok) {
          setErrors((prev) => ({ ...prev, [kind]: saveResult.message }));
          return;
        }

        const existing = (state.assets ?? []).find((a) => a.kind === kind && kind !== "decoration");
        if (existing) {
          invalidateAssetObjectUrl(existing.id);
          await deleteAssetBlob(existing.id);
        }

        const asset = {
          id: assetId,
          projectId: state.projectId,
          kind,
          fileName: compressed ? file.name.replace(/\.[^.]+$/, ".webp") : file.name,
          mimeType,
          size: blob.size,
          width: dims?.width ?? 100,
          height: dims?.height ?? 100,
          createdAt: new Date().toISOString(),
        };

        const withoutKind =
          kind === "decoration"
            ? (state.assets ?? [])
            : (state.assets ?? []).filter((a) => a.kind !== kind);

        const placement = createDefaultAssetPlacement(
          assetId,
          kind,
          state.width,
          state.height,
        );

        const withoutPlacement =
          kind === "decoration"
            ? (state.assetPlacements ?? [])
            : (state.assetPlacements ?? []).filter((p) => p.kind !== kind);

        onUpdate({
          assets: [...withoutKind, asset],
          assetPlacements: [...withoutPlacement, placement],
        });
        if (validation.warnings.length > 0) {
          setErrors((prev) => ({ ...prev, [kind]: validation.warnings[0] ?? "" }));
        }
      } catch {
        setErrors((prev) => ({ ...prev, [kind]: "Upload failed." }));
      } finally {
        setLoading(null);
      }
    },
    [onUpdate, state.assets, state.assetPlacements, state.projectId, state.width, state.height],
  );

  async function handleRemove(assetId: string) {
    invalidateAssetObjectUrl(assetId);
    await deleteAssetBlob(assetId);
    onUpdate({
      assets: (state.assets ?? []).filter((a) => a.id !== assetId),
      assetPlacements: (state.assetPlacements ?? []).filter((p) => p.assetId !== assetId),
    });
  }

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Upload assets</h2>
        <p className="mt-1 text-xs text-zinc-500">PNG, JPEG, WebP, GIF, SVG · Replace updates the slot</p>
      </div>
      <div className="space-y-3 p-4">
        {UPLOAD_SLOTS.map(({ kind, label, id }) => {
          const asset = (state.assets ?? []).find((a) => a.kind === kind && kind !== "decoration")
            ?? (kind === "decoration" ? undefined : undefined);
          const decorationAssets = kind === "decoration"
            ? (state.assets ?? []).filter((a) => a.kind === "decoration")
            : [];
          const current = kind !== "decoration" ? asset : undefined;

          return (
            <div key={kind} className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3">
              <label htmlFor={id} className="mb-2 block text-xs font-medium text-zinc-400">
                {label}
              </label>
              <input
                id={id}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
                disabled={loading === kind}
                className="block w-full text-xs text-zinc-400 file:mr-2 file:rounded file:border-0 file:bg-violet-600 file:px-2 file:py-1 file:text-xs file:text-white"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(kind, file);
                  e.target.value = "";
                }}
              />
              {loading === kind ? (
                <p className="mt-1 text-xs text-zinc-500">Processing…</p>
              ) : null}
              {errors[kind] ? (
                <p className="mt-1 text-xs text-red-400" role="alert">{errors[kind]}</p>
              ) : null}
              {current ? (
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-zinc-400">
                    {current.fileName} · {current.width}×{current.height} · {formatFileSize(current.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRemove(current.id)}
                    className="shrink-0 text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ) : null}
              {kind === "decoration" && decorationAssets.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                  {decorationAssets.map((d) => (
                    <li key={d.id} className="flex justify-between gap-2">
                      <span className="truncate">{d.fileName}</span>
                      <button type="button" onClick={() => void handleRemove(d.id)} className="text-red-400">×</button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
