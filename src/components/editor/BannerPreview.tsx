"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildAssetsMetaKey,
  loadPreviewAssetUrls,
  prunePreviewUrls,
} from "@/lib/assets/asset-storage";
import {
  badgeFlipKeyframes,
  underlineDrawKeyframes,
  zoomRotateKeyframes,
} from "@/lib/animation/effect-presets";
import {
  buildLayerAnimationStyle,
  collectLayerKeyframes,
  presetClassName,
} from "@/lib/animation/animation-presets";
import { clampParticleCount } from "@/lib/animation/keyframe-utils";
import {
  getActiveScene,
  getEffectsForScene,
  getLayersForScene,
  sceneStartOffsetMs,
  totalStoryboardDurationMs,
  transitionKeyframes,
} from "@/lib/animation/storyboard-utils";
import {
  getLayerAnimation,
  getTextPlacement,
} from "@/lib/animation/timeline-utils";
import type { BannerLayer } from "@/types/animation";
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
  onUpdateStoryboardLayer?: (
    layerId: string,
    patch: Partial<BannerAssetPlacement>,
  ) => void;
  playAll?: boolean;
  playbackSceneId?: string | null;
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
      if (!cancelled) setSnapshot({ metaKey, urls: result.urls, missing: result.missing });
    });
    const keepIds = new Set(
      metaKey.split("|").map((part) => {
        const colon = part.indexOf(":");
        return colon > 0 ? part.slice(0, colon) : "";
      }).filter(Boolean),
    );
    prunePreviewUrls(keepIds);
    return () => { cancelled = true; };
  }, [metaKey]);

  if (!metaKey) return EMPTY_SNAPSHOT;
  if (snapshot.metaKey !== metaKey) return { metaKey, urls: {}, missing: [] };
  return snapshot;
}

function isLayerSelected(selected: SelectedLayer | null | undefined, layer: SelectedLayer): boolean {
  if (!selected) return false;
  return selected.type === layer.type && selected.id === layer.id;
}

function buildSceneSequenceCss(
  state: BannerEditorState,
  replayKey: number,
  loop: boolean,
): string {
  const scenes = state.scenes ?? [];
  if (scenes.length <= 1) return transitionKeyframes();

  const total = totalStoryboardDurationMs(state);
  const iter = loop ? "infinite" : 1;
  const rules: string[] = [transitionKeyframes()];

  scenes.forEach((scene, i) => {
    const start = sceneStartOffsetMs(state, scene.id);
    const end = start + scene.durationMs;
    const startPct = (start / total) * 100;
    const endPct = (end / total) * 100;
    const cls = `scene-seq-${scene.id}-${replayKey}`;
    rules.push(`
@keyframes ${cls} {
  0%, ${startPct > 0 ? `${startPct - 0.1}%` : "0%"} { opacity: 0; visibility: hidden; pointer-events: none; }
  ${startPct}% { opacity: 1; visibility: visible; }
  ${endPct}% { opacity: 1; visibility: visible; }
  ${Math.min(endPct + 0.1, 100)}%, 100% { opacity: 0; visibility: hidden; pointer-events: none; }
}
.${cls} {
  animation: ${cls} ${total}ms linear ${iter};
}`);
  });

  return rules.join("\n");
}

function ParticleRender({ layer, replayKey }: { layer: BannerLayer; replayKey: number }) {
  const count = clampParticleCount(layer.particleCount ?? 20);
  const colors = layer.colors ?? ["#fbbf24", "#a78bfa", "#60a5fa"];
  const dur = Math.round(2000 / (layer.speed ?? 1));
  const cls = `particles-${layer.id}-${replayKey}`;

  const css = useMemo(() => {
    const kf: string[] = [];
    for (let i = 0; i < count; i++) {
      kf.push(`
@keyframes ${cls}-p${i} {
  0% { transform: translate(0, 0); opacity: 0.8; }
  100% { transform: translate(${(i % 3) * 20 - 20}px, ${-30 - (i % 5) * 10}px); opacity: 0.2; }
}
.${cls}-p${i} {
  animation: ${cls}-p${i} ${dur}ms ease-in-out ${layer.particleLoop ? "infinite" : "1"} ${(i * 80) % 600}ms;
}`);
    }
    return kf.join("\n");
  }, [cls, count, dur, layer.particleLoop]);

  return (
    <>
      <style>{css}</style>
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ zIndex: layer.zIndex, opacity: layer.opacity }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <span
            key={i}
            className={`${cls}-p${i} absolute rounded-full`}
            style={{
              width: 3 + (i % 3),
              height: 3 + (i % 3),
              background: colors[i % colors.length],
              left: `${(i * 17 + 5) % 95}%`,
              top: `${(i * 23 + 10) % 90}%`,
            }}
          />
        ))}
      </div>
    </>
  );
}

function UnderlineRender({
  layer,
  replayKey,
  interactive,
  selected,
  onSelect,
  onPlacementChange,
  canvasScale,
  state,
}: {
  layer: BannerLayer;
  replayKey: number;
  interactive: boolean;
  selected: boolean;
  onSelect: () => void;
  onPlacementChange: (patch: Partial<BannerAssetPlacement>) => void;
  canvasScale: number;
  state: BannerEditorState;
}) {
  const cls = `underline-${layer.id}-${replayKey}`;
  const dur = layer.drawDurationMs ?? 600;
  const css = underlineDrawKeyframes(cls, dur);

  return (
    <>
      <style>{css}</style>
      <InteractiveCanvasLayer
        selected={selected}
        interactive={interactive}
        placement={{ x: layer.x, y: layer.y, width: layer.width, height: layer.height }}
        rotation={layer.rotation}
        zIndex={layer.zIndex}
        opacity={layer.opacity}
        bannerWidth={state.width}
        bannerHeight={state.height}
        canvasScale={canvasScale}
        replayKey={replayKey}
        animClassName={cls}
        onSelect={onSelect}
        onPlacementChange={onPlacementChange}
      >
        <div
          className="h-full w-full"
          style={{
            backgroundColor: layer.underlineColor ?? state.accentColor,
            borderRadius: 2,
            height: layer.thickness ?? 3,
          }}
        />
      </InteractiveCanvasLayer>
    </>
  );
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
  onUpdateStoryboardLayer,
  playAll = false,
  playbackSceneId,
}: BannerPreviewProps) {
  const assets = state.assets ?? [];
  const assetsMetaKey = buildAssetsMetaKey(assets);
  const { urls, missing, metaKey: urlsMetaKey } = useAssetUrls(assetsMetaKey);
  const urlsReady = assetsMetaKey === urlsMetaKey;
  const activeScene = getActiveScene(state);
  const sceneId = playbackSceneId ?? activeScene?.id;
  const storyboardLayers = sceneId ? getLayersForScene(state, sceneId) : [];
  const extraLayers = storyboardLayers.filter(
    (l) => l.type === "particle" || l.type === "underline" || l.type === "shape",
  );

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
      if (style) rules.push(`.${presetClassName(anim.layerId, replayKey)} { ${style} }`);
    }

    if (sceneId) {
      for (const effect of getEffectsForScene(state, sceneId)) {
        if (effect.preset === "flip-180" || effect.preset === "zoom-rotate-badge") {
          const cls = `${effect.layerId}-fx-${replayKey}`;
          rules.push(
            effect.preset === "flip-180"
              ? badgeFlipKeyframes(cls, effect.durationMs)
              : zoomRotateKeyframes(cls, effect.durationMs),
          );
        }
      }
    }

    if (playAll) rules.push(buildSceneSequenceCss(state, replayKey, loopPreview));

    return rules.join("\n");
  }, [
    state.layerAnimations,
    state.timeline?.loop,
    state.scenes,
    state.layerEffects,
    loopPreview,
    replayKey,
    playAll,
    sceneId,
    state,
  ]);

  const missingSet = useMemo(() => new Set(missing), [missing]);
  const bgColorOnly = !(state.assetPlacements ?? []).some(
    (p) => p.visible && p.kind === "background",
  );
  const sortedAssets = [...(state.assetPlacements ?? [])].sort((a, b) => a.zIndex - b.zIndex);
  const textLayerIds: TextLayerPlacement["layerId"][] = ["headline", "subheadline", "cta"];

  const sceneBg = activeScene?.backgroundColor ?? state.backgroundColor;

  function renderCanvasContent() {
    return (
      <>
        {bgColorOnly ? (
          <div className="absolute inset-0" style={{ backgroundColor: sceneBg, zIndex: 0 }} />
        ) : null}

        {sortedAssets.map((placement) => {
          if (!placement.visible) return null;
          const asset = assets.find((a) => a.id === placement.assetId);
          const url = urls[placement.assetId];
          const isMissing = missingSet.has(placement.assetId);
          const selected = isLayerSelected(selectedLayer, { type: "asset", id: placement.assetId });
          const layerId = placement.kind === "decoration" ? `decoration-${placement.assetId}` : placement.kind;
          const anim = getLayerAnimation(state, layerId);
          const fx = (state.layerEffects ?? []).find(
            (e) => e.layerId === placement.assetId && e.sceneId === sceneId,
          );
          const animClass =
            anim?.enabled && anim.preset !== "none"
              ? presetClassName(layerId, replayKey)
              : fx?.preset === "flip-180" || fx?.preset === "zoom-rotate-badge"
                ? `${placement.assetId}-fx-${replayKey}`
                : "";

          return (
            <InteractiveCanvasLayer
              key={placement.assetId}
              selected={selected}
              interactive={interactive}
              placement={{ x: placement.x, y: placement.y, width: placement.width, height: placement.height }}
              rotation={placement.rotation}
              zIndex={placement.zIndex}
              opacity={placement.opacity}
              bannerWidth={state.width}
              bannerHeight={state.height}
              canvasScale={canvasScale}
              replayKey={replayKey}
              animClassName={interactive ? "" : animClass}
              onSelect={() => onSelectLayer?.({ type: "asset", id: placement.assetId })}
              onPlacementChange={(patch) => onUpdateAssetPlacement?.(placement.assetId, patch)}
            >
              <div
                className="h-full w-full overflow-hidden"
                style={{
                  borderRadius: placement.borderRadius,
                  boxShadow: placement.shadow ? "0 4px 12px rgba(0,0,0,0.25)" : undefined,
                }}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
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
                    style={{ borderColor: `${state.accentColor}66`, color: state.accentColor }}
                  >
                    {urlsReady && isMissing ? "Missing image" : "Loading…"}
                  </div>
                )}
              </div>
            </InteractiveCanvasLayer>
          );
        })}

        {extraLayers.map((layer) => {
          if (!layer.visible) return null;
          if (layer.type === "particle") {
            return <ParticleRender key={layer.id} layer={layer} replayKey={replayKey} />;
          }
          if (layer.type === "underline") {
            const sel =
              selectedLayer?.type === "asset" && selectedLayer.id === layer.id;
            return (
              <UnderlineRender
                key={layer.id}
                layer={layer}
                replayKey={replayKey}
                interactive={interactive}
                selected={!!sel}
                state={state}
                canvasScale={canvasScale}
                onSelect={() => onSelectLayer?.({ type: "asset", id: layer.id })}
                onPlacementChange={(patch) => onUpdateStoryboardLayer?.(layer.id, patch)}
              />
            );
          }
          return null;
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
          const sbLayer = storyboardLayers.find((l) => l.legacyKey === layerId);
          const highlightWord = sbLayer?.highlightWord;
          const underlineWord = sbLayer?.underlineWord;

          let textContent: React.ReactNode = content;
          if (highlightWord && content.includes(highlightWord)) {
            const parts = content.split(highlightWord);
            textContent = (
              <>
                {parts[0]}
                <mark style={{ background: `${state.accentColor}44` }}>{highlightWord}</mark>
                {parts.slice(1).join(highlightWord)}
              </>
            );
          } else if (underlineWord && content.includes(underlineWord)) {
            const parts = content.split(underlineWord);
            textContent = (
              <>
                {parts[0]}
                <u>{underlineWord}</u>
                {parts.slice(1).join(underlineWord)}
              </>
            );
          }

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
              animClassName={interactive ? "" : animClass}
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
                  {textContent}
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
                      textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start",
                  }}
                >
                  {textContent}
                </span>
              )}
            </InteractiveCanvasLayer>
          );
        })}

        <SafeAreaOverlay width={state.width} height={state.height} visible={showSafeArea} />
      </>
    );
  }

  if (playAll && (state.scenes ?? []).length > 1) {
    return (
      <>
        <style>{animationCss}</style>
        <div
          className={`relative overflow-hidden shadow-2xl ${interactive ? "select-none" : ""} ${className}`}
          style={{ width: state.width, height: state.height, backgroundColor: sceneBg, color: state.textColor }}
          role="img"
          aria-label={`Banner preview: ${state.name}`}
        >
          {(state.scenes ?? []).map((scene) => (
            <div
              key={scene.id}
              className={`absolute inset-0 scene-seq-${scene.id}-${replayKey}`}
              style={{ backgroundColor: scene.backgroundColor ?? state.backgroundColor }}
            >
              {scene.id === sceneId ? renderCanvasContent() : null}
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{animationCss}</style>
      <div
        className={`relative overflow-hidden shadow-2xl ${interactive ? "select-none" : ""} ${className}`}
        style={{ width: state.width, height: state.height, backgroundColor: sceneBg, color: state.textColor }}
        role="img"
        aria-label={`Banner preview: ${state.headline}`}
        onPointerDown={() => {
          if (interactive) onSelectLayer?.({ type: "text", id: "headline" });
        }}
      >
        {renderCanvasContent()}
      </div>
    </>
  );
}
