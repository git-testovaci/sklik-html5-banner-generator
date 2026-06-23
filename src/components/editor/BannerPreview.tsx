"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildAssetsMetaKey,
  loadPreviewAssetUrls,
  prunePreviewUrls,
} from "@/lib/assets/asset-storage";
import {
  buildLayerAnimationStyle,
  collectLayerKeyframes,
  presetClassName,
} from "@/lib/animation/animation-presets";
import {
  getLayerAnimation,
  getTextPlacement,
} from "@/lib/animation/timeline-utils";
import type { BannerAssetPlacement, TextLayerPlacement } from "@/types/assets";
import type { BannerEditorState, SelectedLayer } from "@/types/editor";
import { InteractiveCanvasLayer } from "./InteractiveCanvasLayer";
import { SafeAreaOverlay } from "./SafeAreaOverlay";

interface BannerPreviewProps {
  state: BannerEditorState;
  className?: string;
  replayKey?: number;
  loopPreview?: boolean;
  showSafeArea?: boolean;
  interactive?: boolean;
  canvasScale?: number;
  selectedLayer?: SelectedLayer | null;
  onSelectLayer?: (layer: SelectedLayer) => void;
  onUpdateTextPlacement?: (
    layerId: TextLayerPlacement["layerId"],
    patch: Partial<TextLayerPlacement>,
  ) => void;
  onUpdateAssetPlacement?: (
    assetId: string,
    patch: Partial<BannerAssetPlacement>,
  ) => void;
}

interface AssetUrlSnapshot {
  metaKey: string;
  urls: Record<string, string>;
  missing: string[];
}

const EMPTY_SNAPSHOT: AssetUrlSnapshot = { metaKey: "", urls: {}, missing: [] };

function useAssetUrls(metaKey: string) {
  const [snapshot, setSnapshot] = useState<AssetUrlSnapshot>(EMPTY_SNAPSHOT);

  useEffect(() => {
    if (!metaKey) return;

    let cancelled = false;

    void loadPreviewAssetUrls(metaKey).then((result) => {
      if (!cancelled) {
        setSnapshot({ metaKey, urls: result.urls, missing: result.missing });
      }
    });

    const keepIds = new Set(
      metaKey
        .split("|")
        .map((part) => {
          const colon = part.indexOf(":");
          return colon > 0 ? part.slice(0, colon) : "";
        })
        .filter(Boolean),
    );
    prunePreviewUrls(keepIds);

    return () => {
      cancelled = true;
    };
  }, [metaKey]);

  if (!metaKey) return EMPTY_SNAPSHOT;
  if (snapshot.metaKey !== metaKey) {
    return { metaKey, urls: {}, missing: [] };
  }
  return snapshot;
}

function isLayerSelected(
  selected: SelectedLayer | null | undefined,
  layer: SelectedLayer,
): boolean {
  if (!selected) return false;
  return selected.type === layer.type && selected.id === layer.id;
}

export function BannerPreview({
  state,
  className = "",
  replayKey = 0,
  loopPreview = false,
  showSafeArea = false,
  interactive = false,
  canvasScale = 1,
  selectedLayer = null,
  onSelectLayer,
  onUpdateTextPlacement,
  onUpdateAssetPlacement,
}: BannerPreviewProps) {
  const assets = state.assets ?? [];
  const assetsMetaKey = buildAssetsMetaKey(assets);
  const { urls, missing, metaKey: urlsMetaKey } = useAssetUrls(assetsMetaKey);
  const urlsReady = assetsMetaKey === urlsMetaKey;

  const animationCss = useMemo(() => {
    const anims = state.layerAnimations ?? [];
    const keyframes = collectLayerKeyframes(anims, false, replayKey);
    const rules: string[] = keyframes ? [keyframes] : [];

    for (const anim of anims) {
      if (!anim.enabled || anim.preset === "none") continue;
      const loop =
        loopPreview ||
        (anim.preset === "soft-pulse" && (state.timeline?.loop ?? false));
      const style = buildLayerAnimationStyle(anim, loop, false, replayKey);
      if (style) {
        rules.push(`.${presetClassName(anim.layerId, replayKey)} { ${style} }`);
      }
    }
    return rules.join("\n");
  }, [state.layerAnimations, state.timeline?.loop, loopPreview, replayKey]);

  const missingSet = useMemo(() => new Set(missing), [missing]);

  const bgColorOnly = !(state.assetPlacements ?? []).some(
    (p) => p.visible && p.kind === "background",
  );

  const sortedAssets = [...(state.assetPlacements ?? [])].sort(
    (a, b) => a.zIndex - b.zIndex,
  );

  const textLayerIds: TextLayerPlacement["layerId"][] = [
    "headline",
    "subheadline",
    "cta",
  ];

  return (
    <>
      <style>{animationCss}</style>
      <div
        className={`relative overflow-hidden shadow-2xl ${interactive ? "select-none" : ""} ${className}`}
        style={{
          width: state.width,
          height: state.height,
          backgroundColor: state.backgroundColor,
          color: state.textColor,
        }}
        role="img"
        aria-label={`Banner preview: ${state.headline}`}
        onPointerDown={() => {
          if (interactive) onSelectLayer?.({ type: "text", id: "headline" });
        }}
      >
        {bgColorOnly ? (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: state.backgroundColor, zIndex: 0 }}
          />
        ) : null}

        {sortedAssets.map((placement) => {
          if (!placement.visible) return null;
          const asset = assets.find((a) => a.id === placement.assetId);
          const url = urls[placement.assetId];
          const isMissing = missingSet.has(placement.assetId);
          const selected = isLayerSelected(selectedLayer, {
            type: "asset",
            id: placement.assetId,
          });

          return (
            <InteractiveCanvasLayer
              key={placement.assetId}
              selected={selected}
              interactive={interactive}
              placement={{
                x: placement.x,
                y: placement.y,
                width: placement.width,
                height: placement.height,
              }}
              rotation={placement.rotation}
              zIndex={placement.zIndex}
              opacity={placement.opacity}
              bannerWidth={state.width}
              bannerHeight={state.height}
              canvasScale={canvasScale}
              animClassName=""
              onSelect={() => onSelectLayer?.({ type: "asset", id: placement.assetId })}
              onPlacementChange={(patch) =>
                onUpdateAssetPlacement?.(placement.assetId, patch)
              }
            >
              <div
                className="h-full w-full overflow-hidden"
                style={{
                  borderRadius: placement.borderRadius,
                  boxShadow: placement.shadow
                    ? "0 4px 12px rgba(0,0,0,0.25)"
                    : undefined,
                }}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- blob URLs from IndexedDB
                  <img
                    src={url}
                    alt={asset?.kind ?? "asset"}
                    className="pointer-events-none h-full w-full"
                    style={{ objectFit: placement.fit }}
                    draggable={false}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center border border-dashed text-[10px] uppercase"
                    style={{
                      borderColor: `${state.accentColor}66`,
                      color: state.accentColor,
                    }}
                  >
                    {urlsReady && isMissing ? "Missing image" : "Loading…"}
                  </div>
                )}
              </div>
            </InteractiveCanvasLayer>
          );
        })}

        {textLayerIds.map((layerId) => {
          const pl = getTextPlacement(state, layerId);
          if (!pl || pl.visible === false) return null;

          const content =
            layerId === "headline"
              ? state.headline
              : layerId === "subheadline"
                ? state.subheadline
                : state.cta;

          const anim = getLayerAnimation(state, layerId);
          const animClass =
            anim?.enabled && anim.preset !== "none"
              ? presetClassName(layerId, replayKey)
              : "";
          const selected = isLayerSelected(selectedLayer, { type: "text", id: layerId });
          const isCta = layerId === "cta";
          const fontSize =
            pl.fontSize ??
            (isCta
              ? Math.max(8, Math.round(state.height * 0.055))
              : layerId === "headline"
                ? Math.max(10, Math.round(state.height * 0.08))
                : Math.max(8, Math.round(state.height * 0.055)));
          const fontWeight = pl.fontWeight ?? (isCta ? 600 : layerId === "headline" ? 700 : 400);
          const lineHeight = pl.lineHeight ?? (isCta ? 1.2 : layerId === "headline" ? 1.15 : 1.25);
          const textAlign = pl.textAlign ?? (isCta ? "center" : "left");

          return (
            <InteractiveCanvasLayer
              key={layerId}
              selected={selected}
              interactive={interactive}
              placement={{ x: pl.x, y: pl.y, width: pl.width, height: pl.height }}
              rotation={pl.rotation}
              zIndex={pl.zIndex}
              opacity={pl.opacity}
              bannerWidth={state.width}
              bannerHeight={state.height}
              canvasScale={canvasScale}
              replayKey={replayKey}
              animClassName={animClass}
              onSelect={() => onSelectLayer?.({ type: "text", id: layerId })}
              onPlacementChange={(patch) => onUpdateTextPlacement?.(layerId, patch)}
            >
              {isCta ? (
                <span
                  className="flex h-full w-full items-center justify-center rounded px-2.5 py-1"
                  style={{
                    backgroundColor: state.ctaBackgroundColor,
                    color: state.ctaTextColor,
                    fontSize,
                    fontWeight,
                    lineHeight,
                    textAlign,
                  }}
                >
                  {content}
                </span>
              ) : (
                <span
                  className="flex h-full w-full items-center"
                  style={{
                    margin: 0,
                    color: state.textColor,
                    fontSize,
                    fontWeight,
                    lineHeight,
                    textAlign,
                    justifyContent:
                      textAlign === "center"
                        ? "center"
                        : textAlign === "right"
                          ? "flex-end"
                          : "flex-start",
                  }}
                >
                  {content}
                </span>
              )}
            </InteractiveCanvasLayer>
          );
        })}

        <SafeAreaOverlay width={state.width} height={state.height} visible={showSafeArea} />
      </div>
    </>
  );
}
