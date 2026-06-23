"use client";

import { useEffect, useMemo, useState } from "react";
import { createAssetObjectUrl } from "@/lib/assets/asset-storage";
import {
  buildLayerAnimationStyle,
  collectUniqueKeyframes,
  presetClassName,
} from "@/lib/animation/animation-presets";
import {
  getLayerAnimation,
  getTextPlacement,
  normalizeEditorState,
} from "@/lib/animation/timeline-utils";
import type { BannerEditorState } from "@/types/editor";
import { SafeAreaOverlay } from "./SafeAreaOverlay";

interface BannerPreviewProps {
  state: BannerEditorState;
  className?: string;
  replayKey?: number;
  loopPreview?: boolean;
  showSafeArea?: boolean;
}

function useAssetUrls(assetIds: string[]) {
  const assetIdsKey = assetIds.join(",");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [loadedKey, setLoadedKey] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const next: Record<string, string> = {};
      const miss = new Set<string>();
      for (const id of assetIds) {
        const result = await createAssetObjectUrl(id);
        if (result.ok) next[id] = result.value;
        else miss.add(id);
      }
      if (!cancelled) {
        setUrls(next);
        setMissing(miss);
        setLoadedKey(assetIdsKey);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [assetIdsKey, assetIds]);

  const urlsReady = loadedKey === assetIdsKey;
  return { urls: urlsReady ? urls : {}, missing, urlsReady };
}

export function BannerPreview({
  state: rawState,
  className = "",
  replayKey = 0,
  loopPreview = false,
  showSafeArea = false,
}: BannerPreviewProps) {
  const state = useMemo(() => normalizeEditorState(rawState), [rawState]);
  const assets = useMemo(() => state.assets ?? [], [state.assets]);
  const assetIds = useMemo(() => assets.map((a) => a.id), [assets]);
  const { urls, missing, urlsReady } = useAssetUrls(assetIds);

  const animationCss = useMemo(() => {
    const presets = (state.layerAnimations ?? [])
      .filter((a) => a.enabled && a.preset !== "none")
      .map((a) => a.preset);
    const keyframes = collectUniqueKeyframes(presets, 12, false);
    const rules: string[] = keyframes ? [keyframes] : [];

    for (const anim of state.layerAnimations ?? []) {
      if (!anim.enabled || anim.preset === "none") continue;
      const loop = loopPreview || (anim.preset === "soft-pulse" && (state.timeline?.loop ?? false));
      const style = buildLayerAnimationStyle(
        anim.preset,
        anim.startMs,
        anim.durationMs,
        anim.easing,
        loop,
        anim.distancePx,
        false,
      );
      if (style) {
        rules.push(`.${presetClassName(anim.layerId)} { ${style} }`);
      }
    }
    return rules.join("\n");
  }, [state.layerAnimations, state.timeline?.loop, loopPreview]);

  const layers = useMemo(() => {
    const items: Array<{ key: string; zIndex: number; node: React.ReactNode }> = [];

    const bgColorOnly = !(state.assetPlacements ?? []).some(
      (p) => p.visible && p.kind === "background",
    );

    if (bgColorOnly) {
      items.push({
        key: "bg-color",
        zIndex: 0,
        node: (
          <div className="absolute inset-0" style={{ backgroundColor: state.backgroundColor }} />
        ),
      });
    }

    for (const placement of [...(state.assetPlacements ?? [])].sort((a, b) => a.zIndex - b.zIndex)) {
      if (!placement.visible) continue;
      const asset = assets.find((a) => a.id === placement.assetId);
      const layerId =
        placement.kind === "decoration" ? `decoration-${placement.assetId}` : placement.kind;
      const anim = getLayerAnimation(state, layerId);
      const animClass = anim?.enabled && anim.preset !== "none" ? presetClassName(layerId) : "";

      const baseStyle: React.CSSProperties = {
        position: "absolute",
        left: placement.x,
        top: placement.y,
        width: placement.width,
        height: placement.height,
        opacity: placement.opacity,
        transform: `rotate(${placement.rotation}deg)`,
        zIndex: placement.zIndex,
        borderRadius: placement.borderRadius,
        boxShadow: placement.shadow ? "0 4px 12px rgba(0,0,0,0.25)" : undefined,
        overflow: "hidden",
      };

      const url = urls[placement.assetId];
      const isMissing = missing.has(placement.assetId);

      items.push({
        key: placement.assetId,
        zIndex: placement.zIndex,
        node: (
          <div key={`${placement.assetId}-${replayKey}`} className={animClass} style={baseStyle}>
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob URLs from IndexedDB; next/image unsupported
              <img
                src={url}
                alt={asset?.kind ?? "asset"}
                className="h-full w-full"
                style={{ objectFit: placement.fit }}
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
        ),
      });
    }

    const textLayers: Array<{
      id: "headline" | "subheadline" | "cta";
      content: string;
      style: React.CSSProperties;
      className: string;
      Tag: "h1" | "p" | "span";
    }> = [];

    const h = getTextPlacement(state, "headline");
    if (h?.visible !== false) {
      textLayers.push({
        id: "headline",
        Tag: "h1",
        content: state.headline,
        className: presetClassName("headline"),
        style: {
          position: "absolute",
          left: h?.x ?? 8,
          top: h?.y ?? 28,
          width: h?.width ?? state.width * 0.55,
          height: h?.height ?? 40,
          opacity: h?.opacity ?? 1,
          transform: `rotate(${h?.rotation ?? 0}deg)`,
          zIndex: h?.zIndex ?? 30,
          margin: 0,
          fontWeight: 700,
          fontSize: Math.max(10, Math.round(state.height * 0.08)),
          lineHeight: 1.15,
          color: state.textColor,
          display: "flex",
          alignItems: "center",
        },
      });
    }

    const s = getTextPlacement(state, "subheadline");
    if (s?.visible !== false) {
      textLayers.push({
        id: "subheadline",
        Tag: "p",
        content: state.subheadline,
        className: presetClassName("subheadline"),
        style: {
          position: "absolute",
          left: s?.x ?? 8,
          top: s?.y ?? 50,
          width: s?.width ?? state.width * 0.55,
          height: s?.height ?? 30,
          opacity: s?.opacity ?? 1,
          transform: `rotate(${s?.rotation ?? 0}deg)`,
          zIndex: s?.zIndex ?? 31,
          margin: 0,
          fontSize: Math.max(8, Math.round(state.height * 0.055)),
          lineHeight: 1.25,
          color: state.textColor,
          display: "flex",
          alignItems: "center",
        },
      });
    }

    const c = getTextPlacement(state, "cta");
    if (c?.visible !== false) {
      textLayers.push({
        id: "cta",
        Tag: "span",
        content: state.cta,
        className: presetClassName("cta"),
        style: {
          position: "absolute",
          left: c?.x ?? 8,
          top: c?.y ?? 72,
          width: c?.width ?? state.width * 0.35,
          height: c?.height ?? 28,
          opacity: c?.opacity ?? 1,
          transform: `rotate(${c?.rotation ?? 0}deg)`,
          zIndex: c?.zIndex ?? 32,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4px 10px",
          borderRadius: 4,
          backgroundColor: state.ctaBackgroundColor,
          color: state.ctaTextColor,
          fontSize: Math.max(8, Math.round(state.height * 0.055)),
          fontWeight: 600,
        },
      });
    }

    for (const t of textLayers) {
      const Tag = t.Tag;
      items.push({
        key: t.id,
        zIndex: (t.style.zIndex as number) ?? 30,
        node: (
          <Tag key={`${t.id}-${replayKey}`} className={t.className} style={t.style}>
            {t.content}
          </Tag>
        ),
      });
    }

    return items.sort((a, b) => a.zIndex - b.zIndex);
  }, [state, assets, urls, missing, replayKey, urlsReady]);

  return (
    <>
      <style>{animationCss}</style>
      <div
        className={`relative overflow-hidden shadow-2xl ${className}`}
        style={{
          width: state.width,
          height: state.height,
          backgroundColor: state.backgroundColor,
          color: state.textColor,
        }}
        role="img"
        aria-label={`Banner preview: ${state.headline}`}
      >
        {layers.map((l) => (
          <div key={l.key}>{l.node}</div>
        ))}
        <SafeAreaOverlay width={state.width} height={state.height} visible={showSafeArea} />
      </div>
    </>
  );
}
