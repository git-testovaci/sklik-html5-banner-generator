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
import { buildSceneSequenceCss } from "@/lib/animation/scene-sequence-css";
import {
  buildFlatSliceForScene,
  getActiveScene,
  getEffectsForScene,
  getLayersForScene,
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
import { SlotPlaceholder } from "./SlotPlaceholder";
import { isSlotEmpty } from "@/lib/assets/slot-utils";

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
  /** Freezes CSS preview animations while playback RAF is paused. */
  playbackPaused?: boolean;
  /** When true, render read-only (public preview) with storyboard playback */
  publicMode?: boolean;
  onSlotActivate?: (layerId: string) => void;
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
  if (snapshot.metaKey !== metaKey) return { metaKey, urls: {}, missing: [] };
  return snapshot;
}

function isLayerSelected(
  selected: SelectedLayer | null | undefined,
  layer: SelectedLayer,
  storyboardLayers?: BannerLayer[],
): boolean {
  if (!selected) return false;
  if (selected.type !== layer.type) return false;
  if (selected.id === layer.id) return true;
  if (
    selected.type === "asset" &&
    layer.type === "asset" &&
    storyboardLayers
  ) {
    const sb = storyboardLayers.find((l) => l.id === selected.id);
    if (sb?.assetId && sb.assetId === layer.id) return true;
  }
  return false;
}

function isAssetPlacementSelected(
  selected: SelectedLayer | null | undefined,
  assetId: string,
  storyboardLayers: BannerLayer[],
): boolean {
  if (!selected || selected.type !== "asset") return false;
  if (selected.id === assetId) return true;
  return storyboardLayers.some(
    (l) => l.id === selected.id && l.assetId === assetId,
  );
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

interface CanvasContentProps {
  state: BannerEditorState;
  sceneId: string;
  replayKey: number;
  loopPreview: boolean;
  showSafeArea: boolean;
  interactive: boolean;
  canvasScale: number;
  selectedLayer: SelectedLayer | null;
  urls: Record<string, string>;
  missing: string[];
  urlsReady: boolean;
  onSelectLayer?: (layer: SelectedLayer) => void;
  onUpdateTextPlacement?: BannerPreviewProps["onUpdateTextPlacement"];
  onUpdateAssetPlacement?: BannerPreviewProps["onUpdateAssetPlacement"];
  onUpdateStoryboardLayer?: BannerPreviewProps["onUpdateStoryboardLayer"];
  publicMode?: boolean;
  onSlotActivate?: (layerId: string) => void;
}

function CanvasContent({
  state,
  sceneId,
  replayKey,
  loopPreview,
  showSafeArea,
  interactive,
  canvasScale,
  selectedLayer,
  urls,
  missing,
  urlsReady,
  onSelectLayer,
  onUpdateTextPlacement,
  onUpdateAssetPlacement,
  onUpdateStoryboardLayer,
  publicMode = false,
  onSlotActivate,
}: CanvasContentProps) {
  const slice = buildFlatSliceForScene(state, sceneId);
  const renderState: BannerEditorState = { ...state, ...slice };
  const scene = state.scenes?.find((s) => s.id === sceneId);
  const sceneBg = scene?.backgroundColor ?? state.backgroundColor;
  const assets = state.assets ?? [];
  const storyboardLayers = getLayersForScene(state, sceneId);
  const slotLayers = storyboardLayers.filter(
    (l) =>
      l.visible &&
      (l.type === "image" || l.type === "badge") &&
      isSlotEmpty(l) &&
      (l.isTemplateSlot || l.slotKind),
  );
  const extraLayers = storyboardLayers.filter(
    (l) =>
      l.type === "particle" ||
      l.type === "underline" ||
      l.type === "shape" ||
      (l.type === "badge" && !l.assetId && !l.isTemplateSlot && !l.slotKind),
  );
  const missingSet = useMemo(() => new Set(missing), [missing]);
  const bgColorOnly = !(renderState.assetPlacements ?? []).some(
    (p) => p.visible && p.kind === "background",
  );
  const sortedAssets = [...(renderState.assetPlacements ?? [])].sort(
    (a, b) => a.zIndex - b.zIndex,
  );
  const textLayerIds: TextLayerPlacement["layerId"][] = ["headline", "subheadline", "cta"];
  // Extra text layers (e.g. duplicated copies) — each will map to a future timeline track.
  const extraTextLayers = storyboardLayers.filter(
    (l) => l.type === "text" && l.visible && !l.legacyKey,
  );

  const animationCss = useMemo(() => {
    const slice = buildFlatSliceForScene(state, sceneId);
    const anims = slice.layerAnimations ?? [];
    const keyframes = collectLayerKeyframes(anims, false, replayKey);
    const rules: string[] = keyframes ? [keyframes] : [];

    for (const anim of anims) {
      if (!anim.enabled || anim.preset === "none") continue;
      const loop =
        loopPreview ||
        (anim.preset === "soft-pulse" && (slice.timeline?.loop ?? false));
      const style = buildLayerAnimationStyle(anim, loop, false, replayKey);
      if (style) rules.push(`.${presetClassName(anim.layerId, replayKey)} { ${style} }`);
    }

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

    return rules.join("\n");
  }, [
    state,
    sceneId,
    loopPreview,
    replayKey,
  ]);

  return (
    <>
      <style>{animationCss}</style>
      {bgColorOnly ? (
        <div className="absolute inset-0" style={{ backgroundColor: sceneBg, zIndex: 0 }} />
      ) : null}

      {sortedAssets.map((placement) => {
        if (!placement.visible) return null;
        const asset = assets.find((a) => a.id === placement.assetId);
        const url = urls[placement.assetId];
        const isMissing = missingSet.has(placement.assetId);
        const selected = isAssetPlacementSelected(
          selectedLayer,
          placement.assetId,
          storyboardLayers,
        );
        const sbLayer = storyboardLayers.find((l) => l.assetId === placement.assetId);
        const layerId =
          placement.kind === "decoration" ? `decoration-${placement.assetId}` : placement.kind;
        const anim = getLayerAnimation(renderState, layerId);
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
            key={`${sceneId}-${placement.assetId}`}
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
            replayKey={replayKey}
            animClassName={interactive ? "" : animClass}
            onSelect={() =>
              onSelectLayer?.({
                type: "asset",
                id: sbLayer?.id ?? placement.assetId,
              })
            }
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
                <SlotPlaceholder
                  layer={{
                    id: placement.assetId,
                    slotKind:
                      placement.kind === "logo"
                        ? "logo"
                        : placement.kind === "product"
                          ? "product"
                          : placement.kind === "background"
                            ? "background"
                            : "image",
                    slotLabel:
                      urlsReady && isMissing
                        ? "Chybí soubor"
                        : asset?.kind === "product"
                          ? "Produkt"
                          : asset?.kind === "logo"
                            ? "Logo"
                            : "Obrázek",
                    name: asset?.kind ?? "asset",
                    type: "image",
                    persistent: false,
                    visible: true,
                    locked: false,
                    x: placement.x,
                    y: placement.y,
                    width: placement.width,
                    height: placement.height,
                    opacity: placement.opacity,
                    rotation: placement.rotation,
                    scale: 1,
                    zIndex: placement.zIndex,
                    isTemplateSlot: true,
                  }}
                  accentColor={state.accentColor}
                  interactive={interactive && !publicMode}
                  publicMode={publicMode}
                  missingAsset={urlsReady && isMissing}
                />
              )}
            </div>
          </InteractiveCanvasLayer>
        );
      })}

      {slotLayers.map((layer) => {
        const selected = selectedLayer?.type === "asset" && selectedLayer.id === layer.id;
        return (
          <InteractiveCanvasLayer
            key={`${sceneId}-slot-${layer.id}`}
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
            onSelect={() => onSelectLayer?.({ type: "asset", id: layer.id })}
            onPlacementChange={(patch) => onUpdateStoryboardLayer?.(layer.id, patch)}
          >
            <SlotPlaceholder
              layer={layer}
              accentColor={state.accentColor}
              interactive={interactive && !publicMode}
              publicMode={publicMode}
              onActivate={() => onSlotActivate?.(layer.id)}
            />
          </InteractiveCanvasLayer>
        );
      })}

      {extraLayers.map((layer) => {
        if (!layer.visible) return null;
        if (layer.type === "particle") {
          return <ParticleRender key={`${sceneId}-${layer.id}`} layer={layer} replayKey={replayKey} />;
        }
        if (layer.type === "underline") {
          const cls = `underline-${layer.id}-${replayKey}`;
          const dur = layer.drawDurationMs ?? 600;
          return (
            <div key={`${sceneId}-${layer.id}`}>
              <style>{underlineDrawKeyframes(cls, dur)}</style>
              <InteractiveCanvasLayer
                selected={selectedLayer?.type === "asset" && selectedLayer.id === layer.id}
                interactive={interactive}
                placement={{ x: layer.x, y: layer.y, width: layer.width, height: layer.height }}
                rotation={layer.rotation}
                zIndex={layer.zIndex}
                opacity={layer.opacity}
                bannerWidth={state.width}
                bannerHeight={state.height}
                canvasScale={canvasScale}
                replayKey={replayKey}
                animClassName={interactive ? "" : cls}
                onSelect={() => onSelectLayer?.({ type: "asset", id: layer.id })}
                onPlacementChange={(patch) => onUpdateStoryboardLayer?.(layer.id, patch)}
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
            </div>
          );
        }
        if (layer.type === "shape" || (layer.type === "badge" && !layer.assetId)) {
          const fx = (state.layerEffects ?? []).find(
            (e) => e.layerId === layer.id && e.sceneId === sceneId,
          );
          const fxClass =
            !interactive && (fx?.preset === "flip-180" || fx?.preset === "zoom-rotate-badge")
              ? `${layer.id}-fx-${replayKey}`
              : "";
          const isCircle = layer.shapeType === "circle";
          return (
            <InteractiveCanvasLayer
              key={`${sceneId}-${layer.id}`}
              selected={selectedLayer?.type === "asset" && selectedLayer.id === layer.id}
              interactive={interactive}
              placement={{ x: layer.x, y: layer.y, width: layer.width, height: layer.height }}
              rotation={layer.rotation}
              zIndex={layer.zIndex}
              opacity={layer.opacity}
              bannerWidth={state.width}
              bannerHeight={state.height}
              canvasScale={canvasScale}
              replayKey={replayKey}
              animClassName={interactive ? "" : fxClass}
              onSelect={() => onSelectLayer?.({ type: "asset", id: layer.id })}
              onPlacementChange={(patch) => onUpdateStoryboardLayer?.(layer.id, patch)}
            >
              <div
                className="flex h-full w-full items-center justify-center border border-dashed p-1 text-center"
                style={{
                  backgroundColor: layer.fill ?? `${state.accentColor}22`,
                  borderColor: `${state.accentColor}88`,
                  borderRadius: isCircle ? "9999px" : layer.borderRadius ?? 8,
                  color: layer.color ?? state.textColor,
                  fontSize: layer.fontSize ?? 11,
                  fontWeight: layer.fontWeight ?? 700,
                }}
              >
                {layer.text ?? (layer.type === "badge" ? "Badge" : "")}
              </div>
            </InteractiveCanvasLayer>
          );
        }
        return null;
      })}

      {textLayerIds.map((layerId) => {
        const pl = getTextPlacement(renderState, layerId);
        if (!pl || pl.visible === false) return null;
        const sbLayer = storyboardLayers.find(
          (l) => l.legacyKey === layerId || l.id === layerId,
        );
        const content =
          sbLayer?.text ??
          (layerId === "headline"
            ? renderState.headline
            : layerId === "subheadline"
              ? renderState.subheadline
              : renderState.cta);
        const anims = renderState.layerAnimations ?? [];
        const anim =
          anims.find((a) => a.layerId === layerId) ??
          (sbLayer ? anims.find((a) => a.layerId === sbLayer.id) : undefined) ??
          getLayerAnimation(renderState, layerId);
        const animTargetId = sbLayer?.legacyKey ?? sbLayer?.id ?? layerId;
        const animClass =
          anim?.enabled && anim.preset !== "none"
            ? presetClassName(animTargetId, replayKey)
            : "";
        const selected = isLayerSelected(selectedLayer, { type: "text", id: layerId });
        const isCta = layerId === "cta";
        const fontSize =
          pl.fontSize ??
          sbLayer?.fontSize ??
          (isCta
            ? Math.max(8, Math.round(state.height * 0.055))
            : layerId === "headline"
              ? Math.max(10, Math.round(state.height * 0.08))
              : Math.max(8, Math.round(state.height * 0.055)));
        const fontWeight =
          pl.fontWeight ?? sbLayer?.fontWeight ?? (isCta ? 600 : layerId === "headline" ? 700 : 400);
        const lineHeight =
          pl.lineHeight ?? sbLayer?.lineHeight ?? (isCta ? 1.2 : layerId === "headline" ? 1.15 : 1.25);
        const textAlign = pl.textAlign ?? sbLayer?.textAlign ?? (isCta ? "center" : "left");

        return (
          <InteractiveCanvasLayer
            key={`${sceneId}-${layerId}`}
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
                {sbLayer?.highlightWord && content.includes(sbLayer.highlightWord) ? (
                  <>
                    {content.split(sbLayer.highlightWord)[0]}
                    <mark style={{ background: `${state.accentColor}44` }}>
                      {sbLayer.highlightWord}
                    </mark>
                    {content.split(sbLayer.highlightWord).slice(1).join(sbLayer.highlightWord)}
                  </>
                ) : (
                  content
                )}
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

      {extraTextLayers.map((layer) => {
        const anim = (renderState.layerAnimations ?? []).find((a) => a.layerId === layer.id);
        const animClass =
          anim?.enabled && anim.preset !== "none"
            ? presetClassName(layer.id, replayKey)
            : "";
        const fontSize = layer.fontSize ?? Math.max(10, Math.round(state.height * 0.055));
        const fontWeight = layer.fontWeight ?? 400;
        const lineHeight = layer.lineHeight ?? 1.25;
        const textAlign = layer.textAlign ?? "left";
        const content = layer.text ?? "";

        return (
          <InteractiveCanvasLayer
            key={`${sceneId}-${layer.id}`}
            selected={selectedLayer?.type === "asset" && selectedLayer.id === layer.id}
            interactive={interactive}
            placement={{ x: layer.x, y: layer.y, width: layer.width, height: layer.height }}
            rotation={layer.rotation}
            zIndex={layer.zIndex}
            opacity={layer.opacity}
            bannerWidth={state.width}
            bannerHeight={state.height}
            canvasScale={canvasScale}
            replayKey={replayKey}
            animClassName={interactive ? "" : animClass}
            onSelect={() => onSelectLayer?.({ type: "asset", id: layer.id })}
            onPlacementChange={(patch) => onUpdateStoryboardLayer?.(layer.id, patch)}
          >
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
          </InteractiveCanvasLayer>
        );
      })}

      <SafeAreaOverlay width={state.width} height={state.height} visible={showSafeArea} />
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
  playbackPaused = false,
  publicMode = false,
  onSlotActivate,
}: BannerPreviewProps) {
  const assets = state.assets ?? [];
  const assetsMetaKey = buildAssetsMetaKey(assets);
  const { urls, missing, metaKey: urlsMetaKey } = useAssetUrls(assetsMetaKey);
  const urlsReady = assetsMetaKey === urlsMetaKey;
  const activeScene = getActiveScene(state);
  const sceneId = playbackSceneId ?? activeScene?.id;
  const scenes = state.scenes ?? [];

  const sequenceCss = useMemo(() => {
    if (!playAll || scenes.length <= 1) return "";
    return buildSceneSequenceCss(state, replayKey, loopPreview);
  }, [playAll, scenes.length, state, replayKey, loopPreview]);

  const canvasProps = {
    replayKey,
    loopPreview,
    showSafeArea: publicMode ? false : showSafeArea,
    interactive: publicMode ? false : interactive,
    canvasScale,
    selectedLayer: selectedLayer ?? null,
    urls,
    missing,
    urlsReady,
    onSelectLayer,
    onUpdateTextPlacement,
    onUpdateAssetPlacement,
    onUpdateStoryboardLayer,
    publicMode,
    onSlotActivate,
  };

  const pauseStyle = playbackPaused
    ? ({ animationPlayState: "paused" } as const)
    : undefined;

  if (playAll && scenes.length > 1) {
    return (
      <>
        <style>{sequenceCss}</style>
        <div
          className={`relative overflow-hidden shadow-2xl ${interactive ? "select-none" : ""} ${className}`}
          style={{
            width: state.width,
            height: state.height,
            backgroundColor: state.backgroundColor,
            color: state.textColor,
            ...pauseStyle,
          }}
          role="img"
          aria-label={`Banner preview: ${state.name}`}
        >
          {scenes.map((scene) => (
            <div
              key={scene.id}
              className={`absolute inset-0 scene-seq-${scene.id}-${replayKey}`}
              style={{ backgroundColor: scene.backgroundColor ?? state.backgroundColor }}
            >
              <CanvasContent state={state} sceneId={scene.id} {...canvasProps} />
            </div>
          ))}
        </div>
      </>
    );
  }

  const effectiveSceneId = sceneId ?? scenes[0]?.id ?? "default";

  return (
    <div
      className={`relative overflow-hidden shadow-2xl ${interactive ? "select-none" : ""} ${className}`}
      style={{
        width: state.width,
        height: state.height,
        backgroundColor: activeScene?.backgroundColor ?? state.backgroundColor,
        color: state.textColor,
        ...pauseStyle,
      }}
      role="img"
      aria-label={`Banner preview: ${state.headline}`}
      onPointerDown={() => {
        if (interactive) onSelectLayer?.({ type: "text", id: "headline" });
      }}
    >
      <CanvasContent state={state} sceneId={effectiveSceneId} {...canvasProps} />
    </div>
  );
}
