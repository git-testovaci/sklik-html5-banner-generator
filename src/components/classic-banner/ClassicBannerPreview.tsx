"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampClassicBannerRect,
  resolveClassicBannerFinalLayout,
  type ClassicBannerResolvedLayer,
} from "@/lib/classic-banner/classic-banner-overrides";
import type { ClassicBannerLayoutRect } from "@/lib/classic-banner/classic-banner-layout";
import {
  hasClassicBannerImageSource,
  resolveClassicBannerImageSources,
  type ClassicBannerImageSlot,
} from "@/lib/classic-banner/classic-banner-image-sources";
import {
  CLASSIC_ASPECT_RATIO_SLOTS,
  CLASSIC_SLOT_CZECH_NAMES,
} from "@/lib/classic-banner/classic-banner-selection";
import type { BannerAsset } from "@/types/assets";
import type {
  ClassicBannerLayerOverride,
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicEditableSlotId,
} from "@/types/classic-banner";
import { ClassicCanvasToolbar, clampZoom } from "./ClassicCanvasToolbar";

type Corner = "tl" | "tr" | "bl" | "br";

interface ClassicBannerPreviewProps {
  variant: ClassicBannerSizeVariant;
  data: ClassicBannerProjectData;
  assets?: BannerAsset[];
  viewZoom: number;
  onViewZoomChange: (zoom: number) => void;
  selectedSlotId: ClassicEditableSlotId | null;
  onSelectSlot: (slotId: ClassicEditableSlotId | null) => void;
  onLayerOverride: (
    slotId: ClassicEditableSlotId,
    patch: Partial<ClassicBannerLayerOverride>,
  ) => void;
  maxFitWidth?: number;
}

function layerStyle(
  rect: ClassicBannerLayoutRect,
  zIndex: number,
): React.CSSProperties {
  return {
    position: "absolute",
    left: `${rect.left}%`,
    top: `${rect.top}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`,
    overflow: "hidden",
    zIndex,
  };
}

const EMPTY_IMAGE_URLS: Record<ClassicBannerImageSlot, string | null> = {
  background: null,
  logo: null,
  hero: null,
};

function SelectionOverlay({
  visible,
  locked,
  label,
}: {
  visible: boolean;
  locked: boolean;
  label: string;
}) {
  if (!visible) return null;
  return (
    <>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-[20] rounded-sm ${
          locked
            ? "border-2 border-dashed border-amber-400/90 ring-1 ring-amber-400/35"
            : "border-2 border-violet-400 ring-1 ring-violet-400/40 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
        }`}
      />
      <span className="pointer-events-none absolute -top-5 left-0 z-[21] rounded bg-zinc-950/90 px-1.5 py-0.5 text-[9px] font-medium text-zinc-200">
        {label}
        {locked ? " · zamknuto" : ""}
      </span>
    </>
  );
}

function ResizeHandle({
  corner,
  onPointerDown,
}: {
  corner: Corner;
  onPointerDown: (e: React.PointerEvent, corner: Corner) => void;
}) {
  const position: Record<Corner, string> = {
    tl: "-left-1.5 -top-1.5 cursor-nwse-resize",
    tr: "-right-1.5 -top-1.5 cursor-nesw-resize",
    bl: "-left-1.5 -bottom-1.5 cursor-nesw-resize",
    br: "-right-1.5 -bottom-1.5 cursor-nwse-resize",
  };

  return (
    <span
      data-resize-handle
      role="presentation"
      onPointerDown={(e) => onPointerDown(e, corner)}
      className={`absolute z-[22] h-3 w-3 rounded-sm border border-white bg-violet-500 shadow ${position[corner]}`}
    />
  );
}

interface InteractiveLayerProps {
  layer: ClassicBannerResolvedLayer;
  selected: boolean;
  bannerWidth: number;
  bannerHeight: number;
  canvasScale: number;
  onSelect: () => void;
  onRectChange: (rect: ClassicBannerLayoutRect) => void;
  pointerEvents: "auto" | "none";
  children: React.ReactNode;
}

function InteractiveLayer({
  layer,
  selected,
  bannerWidth,
  bannerHeight,
  canvasScale,
  onSelect,
  onRectChange,
  pointerEvents,
  children,
}: InteractiveLayerProps) {
  const { rect, locked, slotId } = layer;
  const canInteract = !locked && pointerEvents === "auto";

  const startDrag = useCallback(
    (e: React.PointerEvent, mode: "move" | Corner) => {
      if (!canInteract) {
        if (pointerEvents === "auto") {
          e.stopPropagation();
          onSelect();
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      onSelect();

      const target = e.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      const scale = canvasScale > 0 ? canvasScale : 1;
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const origin = { ...rect };
      const preserveAspect = CLASSIC_ASPECT_RATIO_SLOTS.has(slotId) && !e.shiftKey;
      const aspect = origin.width / Math.max(origin.height, 0.01);

      function toPercentDelta(dx: number, dy: number) {
        return {
          dxPct: (dx / scale / bannerWidth) * 100,
          dyPct: (dy / scale / bannerHeight) * 100,
        };
      }

      function onMove(ev: PointerEvent) {
        const dx = ev.clientX - startClientX;
        const dy = ev.clientY - startClientY;
        const { dxPct, dyPct } = toPercentDelta(dx, dy);

        if (mode === "move") {
          onRectChange(
            clampClassicBannerRect({
              ...origin,
              left: origin.left + dxPct,
              top: origin.top + dyPct,
            }),
          );
          return;
        }

        const next = { ...origin };

        if (mode === "br") {
          next.width = origin.width + dxPct;
          next.height = origin.height + dyPct;
        } else if (mode === "bl") {
          next.left = origin.left + dxPct;
          next.width = origin.width - dxPct;
          next.height = origin.height + dyPct;
        } else if (mode === "tr") {
          next.top = origin.top + dyPct;
          next.width = origin.width + dxPct;
          next.height = origin.height - dyPct;
        } else if (mode === "tl") {
          next.left = origin.left + dxPct;
          next.top = origin.top + dyPct;
          next.width = origin.width - dxPct;
          next.height = origin.height - dyPct;
        }

        if (preserveAspect) {
          const w = Math.max(next.width, 2);
          next.height = w / aspect;
          if (mode === "tl" || mode === "bl") {
            next.top = origin.top + origin.height - next.height;
          }
          if (mode === "tl" || mode === "tr") {
            next.left = origin.left + origin.width - next.width;
          }
        }

        onRectChange(clampClassicBannerRect(next));
      }

      function onUp(ev: PointerEvent) {
        try {
          target.releasePointerCapture(ev.pointerId);
        } catch {
          // ignore
        }
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        target.removeEventListener("pointercancel", onUp);
      }

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
      target.addEventListener("pointercancel", onUp);
    },
    [bannerHeight, bannerWidth, canInteract, canvasScale, onRectChange, onSelect, pointerEvents, rect, slotId],
  );

  return (
    <div
      className={`absolute touch-none select-none ${
        locked ? "cursor-not-allowed" : canInteract ? "cursor-move" : pointerEvents === "auto" ? "cursor-pointer" : ""
      }`}
      style={{
        ...layerStyle(rect, layer.zIndex),
        pointerEvents,
      }}
      onPointerDown={(e) => {
        if (pointerEvents !== "auto") return;
        if ((e.target as HTMLElement).closest("[data-resize-handle]")) return;
        startDrag(e, "move");
      }}
      onClick={(e) => {
        if (pointerEvents !== "auto") return;
        e.stopPropagation();
        onSelect();
      }}
    >
      <SelectionOverlay
        visible={selected}
        locked={locked}
        label={CLASSIC_SLOT_CZECH_NAMES[slotId]}
      />
      {canInteract && selected ? (
        (["tl", "tr", "bl", "br"] as Corner[]).map((corner) => (
          <ResizeHandle
            key={corner}
            corner={corner}
            onPointerDown={(e, c) => startDrag(e, c)}
          />
        ))
      ) : null}
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}

export function ClassicBannerPreview({
  variant,
  data,
  assets = [],
  viewZoom,
  onViewZoomChange,
  selectedSlotId,
  onSelectSlot,
  onLayerOverride,
  maxFitWidth = 520,
}: ClassicBannerPreviewProps) {
  const { width, height } = variant;
  const { content, designTokens } = data;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [imageUrls, setImageUrls] =
    useState<Record<ClassicBannerImageSlot, string | null>>(EMPTY_IMAGE_URLS);

  const layout = useMemo(
    () => resolveClassicBannerFinalLayout(data, variant),
    [data, variant],
  );

  useEffect(() => {
    let cancelled = false;
    void resolveClassicBannerImageSources(content, assets).then((resolved) => {
      if (cancelled) return;
      setImageUrls({
        background: resolved.background.url,
        logo: resolved.logo.url,
        hero: resolved.hero.url,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [content, assets]);

  const fitScale = Math.min(1, maxFitWidth / width);
  const totalScale = fitScale * viewZoom;
  const frameWidth = width * totalScale;
  const frameHeight = height * totalScale;

  const handleFitToView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      onViewZoomChange(1);
      return;
    }
    const padding = 48;
    const availableW = Math.max(viewport.clientWidth - padding, 120);
    const availableH = Math.max(viewport.clientHeight - padding, 120);
    const fit = Math.min(availableW / (width * fitScale), availableH / (height * fitScale), 1);
    onViewZoomChange(clampZoom(fit));
  }, [fitScale, height, onViewZoomChange, width]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      onViewZoomChange(clampZoom(viewZoom + delta));
    },
    [onViewZoomChange, viewZoom],
  );

  function renderLayerContent(slotId: ClassicEditableSlotId) {
    switch (slotId) {
      case "background":
        return hasClassicBannerImageSource(content, "background") && imageUrls.background ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrls.background} alt="" className="h-full w-full object-cover" />
        ) : null;
      case "hero":
        return imageUrls.hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrls.hero} alt="" className="max-h-full max-w-full object-contain" />
        ) : null;
      case "headline":
        return (
          <div
            style={{
              color: designTokens.textColor,
              fontFamily: designTokens.fontFamily,
              fontWeight: designTokens.headlineFontWeight,
              fontSize: layout.headlineFontSize,
              lineHeight: 1.15,
              whiteSpace: "pre-line",
              display: "-webkit-box",
              WebkitLineClamp: layout.headlineMaxLines,
              WebkitBoxOrient: "vertical",
            }}
          >
            {content.headline}
          </div>
        );
      case "slogan":
        return (
          <div
            style={{
              color: designTokens.textColor,
              fontFamily: designTokens.fontFamily,
              fontWeight: designTokens.bodyFontWeight,
              fontSize: layout.sloganFontSize,
              lineHeight: 1.2,
              opacity: 0.92,
            }}
          >
            {content.slogan}
          </div>
        );
      case "logo":
        return imageUrls.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrls.logo}
            alt="Logo"
            className="max-h-full max-w-full object-contain object-left-top"
            style={{ maxHeight: layout.logoMaxHeight }}
          />
        ) : null;
      case "cta":
        return (
          <span
            className="inline-flex items-center justify-center"
            style={{
              backgroundColor: designTokens.ctaBackgroundColor,
              color: designTokens.ctaTextColor,
              fontFamily: designTokens.fontFamily,
              fontWeight: designTokens.headlineFontWeight,
              fontSize: layout.ctaFontSize,
              borderRadius: designTokens.borderRadius,
              padding: `${layout.ctaPaddingY}px ${layout.ctaPaddingX}px`,
              maxWidth: "100%",
            }}
          >
            {content.ctaText}
          </span>
        );
      case "badge":
        return (
          <span
            className="inline-flex items-center justify-center rounded-full font-semibold"
            style={{
              backgroundColor: designTokens.badgeBackgroundColor,
              color: designTokens.badgeTextColor,
              fontSize: layout.badgeFontSize,
              padding: "2px 8px",
              minWidth: layout.badgeFontSize * 2,
            }}
          >
            {content.badgeText}
          </span>
        );
      default:
        return null;
    }
  }

  const visibleLayers = layout.layers.filter((layer) => layer.visible);

  return (
    <div
      ref={viewportRef}
      className="flex w-full max-w-full flex-col items-center gap-3"
      onWheel={handleWheel}
    >
      <ClassicCanvasToolbar
        zoom={viewZoom}
        onZoomChange={onViewZoomChange}
        onFitToView={handleFitToView}
      />

      <div
        className="relative overflow-hidden rounded-lg border border-zinc-700/80 bg-zinc-900 shadow-xl"
        style={{ width: frameWidth, height: frameHeight }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onSelectSlot(null);
        }}
      >
        <div
          className="relative origin-top-left"
          style={{
            width,
            height,
            transform: `scale(${totalScale})`,
          }}
          role="img"
          aria-label={`Náhled banneru ${width}×${height}`}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onSelectSlot(null);
          }}
        >
          {/* Base fill — not selectable */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: designTokens.primaryColor,
              zIndex: layout.zIndex.background,
              pointerEvents: "none",
            }}
          />

          {visibleLayers.map((layer) => {
            const isBackground = layer.slotId === "background";
            const pointerEvents: "auto" | "none" =
              isBackground && selectedSlotId !== "background" ? "none" : "auto";

            if (layer.slotId === "hero") {
              return (
                <InteractiveLayer
                  key={layer.slotId}
                  layer={layer}
                  selected={selectedSlotId === layer.slotId}
                  bannerWidth={width}
                  bannerHeight={height}
                  canvasScale={totalScale}
                  onSelect={() => onSelectSlot(layer.slotId)}
                  onRectChange={(rect) => onLayerOverride(layer.slotId, { rect })}
                  pointerEvents={pointerEvents}
                >
                  <div className="flex h-full w-full items-center justify-center">
                    {renderLayerContent(layer.slotId)}
                  </div>
                </InteractiveLayer>
              );
            }

            if (layer.slotId === "logo") {
              return (
                <InteractiveLayer
                  key={layer.slotId}
                  layer={layer}
                  selected={selectedSlotId === layer.slotId}
                  bannerWidth={width}
                  bannerHeight={height}
                  canvasScale={totalScale}
                  onSelect={() => onSelectSlot(layer.slotId)}
                  onRectChange={(rect) => onLayerOverride(layer.slotId, { rect })}
                  pointerEvents={pointerEvents}
                >
                  <div className="flex h-full w-full items-start justify-start">
                    {renderLayerContent(layer.slotId)}
                  </div>
                </InteractiveLayer>
              );
            }

            if (layer.slotId === "cta") {
              return (
                <InteractiveLayer
                  key={layer.slotId}
                  layer={layer}
                  selected={selectedSlotId === layer.slotId}
                  bannerWidth={width}
                  bannerHeight={height}
                  canvasScale={totalScale}
                  onSelect={() => onSelectSlot(layer.slotId)}
                  onRectChange={(rect) => onLayerOverride(layer.slotId, { rect })}
                  pointerEvents={pointerEvents}
                >
                  <div className="flex h-full w-full items-end">{renderLayerContent(layer.slotId)}</div>
                </InteractiveLayer>
              );
            }

            if (layer.slotId === "badge") {
              return (
                <InteractiveLayer
                  key={layer.slotId}
                  layer={layer}
                  selected={selectedSlotId === layer.slotId}
                  bannerWidth={width}
                  bannerHeight={height}
                  canvasScale={totalScale}
                  onSelect={() => onSelectSlot(layer.slotId)}
                  onRectChange={(rect) => onLayerOverride(layer.slotId, { rect })}
                  pointerEvents={pointerEvents}
                >
                  <div className="flex h-full w-full items-start justify-end">
                    {renderLayerContent(layer.slotId)}
                  </div>
                </InteractiveLayer>
              );
            }

            return (
              <InteractiveLayer
                key={layer.slotId}
                layer={layer}
                selected={selectedSlotId === layer.slotId}
                bannerWidth={width}
                bannerHeight={height}
                canvasScale={totalScale}
                onSelect={() => onSelectSlot(layer.slotId)}
                onRectChange={(rect) => onLayerOverride(layer.slotId, { rect })}
                pointerEvents={pointerEvents}
              >
                {renderLayerContent(layer.slotId)}
              </InteractiveLayer>
            );
          })}
        </div>
      </div>

      <p className="font-mono text-sm text-zinc-400">
        {width}×{height} · náhled {Math.round(totalScale * 100)}%
      </p>
    </div>
  );
}
