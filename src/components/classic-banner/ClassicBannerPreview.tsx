"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampClassicBannerRotation,
  classicBannerSlotHasRectOverride,
  resolveClassicBannerFinalLayout,
  type ClassicBannerFinalLayout,
  type ClassicBannerResolvedLayer,
} from "@/lib/classic-banner/classic-banner-overrides";
import {
  buildClassicBannerSnapGuides,
  snapClassicBannerMove,
  snapClassicBannerResize,
  type ClassicBannerSnapGuideLine,
} from "@/lib/classic-banner/classic-banner-snapping";
import type { ClassicBannerLayoutRect } from "@/lib/classic-banner/classic-banner-layout";
import {
  computeClassicImageRenderedRect,
  getClassicImageSlotFitOptions,
  resolveClassicBackgroundTransform,
  type ClassicBackgroundTransform,
  type ClassicImageDimensions,
} from "@/lib/classic-banner/classic-banner-image-fit";
import {
  getClassicBannerImageDimensionsFromAssets,
  hasClassicBannerImageSource,
  resolveClassicBannerImageDimensionsMap,
  resolveClassicBannerImageSources,
  type ClassicBannerImageSlot,
} from "@/lib/classic-banner/classic-banner-image-sources";
import {
  CLASSIC_ASPECT_RATIO_SLOTS,
  CLASSIC_SLOT_CZECH_NAMES,
  type ClassicBannerResizeCorner,
} from "@/lib/classic-banner/classic-banner-selection";
import type { BannerAsset } from "@/types/assets";
import type {
  ClassicBannerLayerOverride,
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicEditableSlotId,
} from "@/types/classic-banner";
import { ClassicCanvasToolbar, ZOOM_STEP, clampZoom } from "./ClassicCanvasToolbar";

type Corner = ClassicBannerResizeCorner;

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

function layerTransformStyle(
  rect: ClassicBannerLayoutRect,
  zIndex: number,
  rotationDeg: number,
): React.CSSProperties {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return {
    position: "absolute",
    left: `${cx}%`,
    top: `${cy}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`,
    transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
    transformOrigin: "center center",
    overflow: "visible",
    zIndex,
  };
}

const EMPTY_IMAGE_URLS: Record<ClassicBannerImageSlot, string | null> = {
  background: null,
  logo: null,
  hero: null,
};

const EMPTY_IMAGE_DIMENSIONS: Record<ClassicBannerImageSlot, ClassicImageDimensions | null> = {
  background: null,
  logo: null,
  hero: null,
};

function resolveImageChromeRect(
  slotId: ClassicEditableSlotId,
  layerRect: ClassicBannerLayoutRect,
  dimensions: ClassicImageDimensions | null,
  bannerWidth: number,
  bannerHeight: number,
  logoMaxHeight: number,
): ClassicBannerLayoutRect | undefined {
  if (slotId !== "logo" && slotId !== "hero") return undefined;
  if (!dimensions) return undefined;
  const fitOpts = getClassicImageSlotFitOptions(slotId, logoMaxHeight);
  if (!fitOpts) return undefined;
  return computeClassicImageRenderedRect({
    layerRect,
    imageWidth: dimensions.width,
    imageHeight: dimensions.height,
    fit: fitOpts.fit,
    bannerWidth,
    bannerHeight,
    maxHeightPx: fitOpts.maxHeightPx,
    align: fitOpts.align,
    allowUpscale: fitOpts.allowUpscale,
  });
}

function rectsNearlyEqual(
  a: ClassicBannerLayoutRect,
  b: ClassicBannerLayoutRect,
  epsilon = 0.05,
): boolean {
  return (
    Math.abs(a.left - b.left) <= epsilon &&
    Math.abs(a.top - b.top) <= epsilon &&
    Math.abs(a.width - b.width) <= epsilon &&
    Math.abs(a.height - b.height) <= epsilon
  );
}

function SnapGuideOverlay({ guides }: { guides: ClassicBannerSnapGuideLine[] }) {
  if (guides.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[200]" aria-hidden>
      {guides.map((guide, index) =>
        guide.axis === "x" ? (
          <div
            key={`snap-x-${index}-${guide.positionPercent}`}
            className="absolute bottom-0 top-0 w-px bg-violet-400/90 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{ left: `${guide.positionPercent}%` }}
          />
        ) : (
          <div
            key={`snap-y-${index}-${guide.positionPercent}`}
            className="absolute left-0 right-0 h-px bg-emerald-400/90 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{ top: `${guide.positionPercent}%` }}
          />
        ),
      )}
    </div>
  );
}

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
      <span className="pointer-events-none absolute -top-5 left-0 z-[21] whitespace-nowrap rounded bg-zinc-950/90 px-1.5 py-0.5 text-[9px] font-medium text-zinc-200">
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
    tl: "-left-2 -top-2 cursor-nwse-resize",
    tr: "-right-2 -top-2 cursor-nesw-resize",
    bl: "-left-2 -bottom-2 cursor-nesw-resize",
    br: "-right-2 -bottom-2 cursor-nwse-resize",
  };

  return (
    <span
      data-resize-handle
      role="presentation"
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onPointerDown(e, corner);
      }}
      className={`absolute z-[22] h-4 w-4 rounded-sm border-2 border-white bg-violet-500 shadow-md pointer-events-auto ${position[corner]}`}
    />
  );
}

function RotationHandle({
  onPointerDown,
}: {
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <span
      data-rotate-handle
      role="presentation"
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onPointerDown(e);
      }}
      className="absolute -top-8 left-1/2 z-[23] h-4 w-4 -translate-x-1/2 cursor-grab rounded-full border-2 border-white bg-emerald-500 shadow-md pointer-events-auto active:cursor-grabbing"
      title="Otáčet vrstvu"
    />
  );
}

interface InteractiveLayerProps {
  layer: ClassicBannerResolvedLayer;
  selected: boolean;
  bannerWidth: number;
  bannerHeight: number;
  canvasScale: number;
  chromeRect?: ClassicBannerLayoutRect;
  interactionRect?: ClassicBannerLayoutRect;
  imageAspect?: number;
  onSelect: () => void;
  onRectChange: (rect: ClassicBannerLayoutRect) => void;
  onRotationChange: (rotationDeg: number) => void;
  pointerEvents: "auto" | "none";
  finalLayout: ClassicBannerFinalLayout;
  onSnapGuidesChange: (guides: ClassicBannerSnapGuideLine[]) => void;
}

function InteractiveLayer({
  layer,
  selected,
  bannerWidth,
  bannerHeight,
  canvasScale,
  chromeRect,
  interactionRect,
  imageAspect,
  onSelect,
  onRectChange,
  onRotationChange,
  pointerEvents,
  finalLayout,
  onSnapGuidesChange,
}: InteractiveLayerProps) {
  const { rect, locked, slotId, rotationDeg } = layer;
  const chrome = chromeRect ?? rect;
  const hit = interactionRect ?? rect;
  const usesChromeRect = chromeRect !== undefined && !rectsNearlyEqual(chromeRect, rect);
  const usesInteractionRect =
    interactionRect !== undefined && !rectsNearlyEqual(interactionRect, rect);
  const transformBase = interactionRect ?? (usesChromeRect ? chrome : rect);
  const canInteract = !locked && pointerEvents === "auto";
  const suppressClickRef = useRef(false);
  const hitRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);

  const startDrag = useCallback(
    (e: React.PointerEvent, mode: "move" | Corner) => {
      if (e.button !== 0) return;
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
      const origin = { ...transformBase };
      const preserveAspect = CLASSIC_ASPECT_RATIO_SLOTS.has(slotId) && !e.shiftKey;
      const aspect =
        imageAspect ?? origin.width / Math.max(origin.height, 0.01);
      const snapGuides = buildClassicBannerSnapGuides(finalLayout, slotId, {
        includeOtherLayers: true,
      });
      suppressClickRef.current = false;
      let dragStarted = mode !== "move";

      function toPercentDelta(dx: number, dy: number) {
        return {
          dxPct: (dx / scale / bannerWidth) * 100,
          dyPct: (dy / scale / bannerHeight) * 100,
        };
      }

      function onMove(ev: PointerEvent) {
        const dx = ev.clientX - startClientX;
        const dy = ev.clientY - startClientY;
        if (!dragStarted) {
          if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
          dragStarted = true;
        }
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          suppressClickRef.current = true;
        }
        const { dxPct, dyPct } = toPercentDelta(dx, dy);
        const snapContext = {
          bannerWidth,
          bannerHeight,
          canvasScale: scale,
          enabled: !ev.altKey,
        };

        if (mode === "move") {
          const result = snapClassicBannerMove({
            rect: origin,
            deltaXPercent: dxPct,
            deltaYPercent: dyPct,
            slotId,
            guides: snapGuides,
            context: snapContext,
          });
          onSnapGuidesChange(result.activeGuides);
          onRectChange(result.rect);
          return;
        }

        const result = snapClassicBannerResize({
          rect: origin,
          corner: mode,
          deltaXPercent: dxPct,
          deltaYPercent: dyPct,
          preserveAspect,
          aspectRatio: aspect,
          slotId,
          guides: snapGuides,
          context: snapContext,
        });
        onSnapGuidesChange(result.activeGuides);
        onRectChange(result.rect);
      }

      function onUp(ev: PointerEvent) {
        onSnapGuidesChange([]);
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
    [bannerHeight, bannerWidth, canInteract, canvasScale, finalLayout, imageAspect, onRectChange, onSelect, onSnapGuidesChange, pointerEvents, slotId, transformBase],
  );

  const startRotate = useCallback(
    (e: React.PointerEvent) => {
      if (!canInteract) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect();

      const target = e.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      const layerEl = chromeRef.current;
      if (!layerEl) return;
      const box = layerEl.getBoundingClientRect();
      const centerX = box.left + box.width / 2;
      const centerY = box.top + box.height / 2;
      const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const startRotation = rotationDeg;
      suppressClickRef.current = false;

      function onMove(ev: PointerEvent) {
        suppressClickRef.current = true;
        const angle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
        const deltaDeg = ((angle - startAngle) * 180) / Math.PI;
        onRotationChange(clampClassicBannerRotation(startRotation + deltaDeg));
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
    [canInteract, onRotationChange, onSelect, rotationDeg],
  );

  const hitUsesRotation = usesInteractionRect || slotId === "background" || usesChromeRect;
  const unifiedInteraction = interactionRect !== undefined;

  if (unifiedInteraction) {
    return (
      <div
        ref={chromeRef}
        className={`absolute touch-none select-none ${
          locked
            ? "cursor-not-allowed"
            : canInteract
              ? "cursor-move"
              : pointerEvents === "auto"
                ? "cursor-pointer"
                : ""
        }`}
        style={{
          ...layerTransformStyle(hit, layer.zIndex, rotationDeg),
          pointerEvents,
        }}
        onPointerDown={(e) => {
          if (pointerEvents !== "auto") return;
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest("[data-resize-handle], [data-rotate-handle]")) return;
          startDrag(e, "move");
        }}
        onClick={(e) => {
          if (pointerEvents !== "auto") return;
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            e.stopPropagation();
            return;
          }
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
          <>
            <RotationHandle onPointerDown={startRotate} />
            {(["tl", "tr", "bl", "br"] as Corner[]).map((corner) => (
              <ResizeHandle
                key={corner}
                corner={corner}
                onPointerDown={(e, c) => startDrag(e, c)}
              />
            ))}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div
        ref={hitRef}
        className={`absolute touch-none select-none ${
          locked
            ? "cursor-not-allowed"
            : canInteract
              ? "cursor-move"
              : pointerEvents === "auto"
                ? "cursor-pointer"
                : ""
        }`}
        style={{
          ...layerTransformStyle(hit, layer.zIndex, hitUsesRotation ? rotationDeg : 0),
          pointerEvents,
        }}
        onPointerDown={(e) => {
          if (pointerEvents !== "auto") return;
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest("[data-resize-handle], [data-rotate-handle]")) return;
          startDrag(e, "move");
        }}
        onClick={(e) => {
          if (pointerEvents !== "auto") return;
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            e.stopPropagation();
            return;
          }
          e.stopPropagation();
          onSelect();
        }}
      />
      <div
        ref={chromeRef}
        className="pointer-events-none absolute touch-none select-none"
        style={{
          ...layerTransformStyle(chrome, layer.zIndex, rotationDeg),
        }}
      >
        <SelectionOverlay
          visible={selected}
          locked={locked}
          label={CLASSIC_SLOT_CZECH_NAMES[slotId]}
        />
        {canInteract && selected ? (
          <>
            <RotationHandle onPointerDown={startRotate} />
            {(["tl", "tr", "bl", "br"] as Corner[]).map((corner) => (
              <ResizeHandle
                key={corner}
                corner={corner}
                onPointerDown={(e, c) => startDrag(e, c)}
              />
            ))}
          </>
        ) : null}
      </div>
    </>
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
  const frameRef = useRef<HTMLDivElement>(null);
  const viewZoomRef = useRef(viewZoom);
  const layoutRef = useRef(resolveClassicBannerFinalLayout(data, variant));
  const selectedSlotIdRef = useRef(selectedSlotId);
  const [imageUrls, setImageUrls] =
    useState<Record<ClassicBannerImageSlot, string | null>>(EMPTY_IMAGE_URLS);
  const [imageDimensions, setImageDimensions] = useState(EMPTY_IMAGE_DIMENSIONS);
  const [activeSnapGuides, setActiveSnapGuides] = useState<ClassicBannerSnapGuideLine[]>([]);

  const assetImageDimensions = useMemo(
    () => ({
      background: getClassicBannerImageDimensionsFromAssets(content, "background", assets),
      logo: getClassicBannerImageDimensionsFromAssets(content, "logo", assets),
      hero: getClassicBannerImageDimensionsFromAssets(content, "hero", assets),
    }),
    [content, assets],
  );

  const resolvedImageDimensions = useMemo(
    () => ({
      background: assetImageDimensions.background ?? imageDimensions.background,
      logo: assetImageDimensions.logo ?? imageDimensions.logo,
      hero: assetImageDimensions.hero ?? imageDimensions.hero,
    }),
    [assetImageDimensions, imageDimensions],
  );

  useEffect(() => {
    viewZoomRef.current = viewZoom;
  }, [viewZoom]);

  const layout = useMemo(
    () => resolveClassicBannerFinalLayout(data, variant),
    [data, variant],
  );

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    selectedSlotIdRef.current = selectedSlotId;
  }, [selectedSlotId]);

  const canvasLayers = useMemo(
    () => layout.layers.filter((layer) => layer.visible),
    [layout],
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

  useEffect(() => {
    let cancelled = false;
    void resolveClassicBannerImageDimensionsMap(content, assets).then((resolved) => {
      if (cancelled) return;
      setImageDimensions(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [content, assets]);

  const fitScale = Math.min(1, maxFitWidth / width);
  const totalScale = fitScale * viewZoom;
  const frameWidth = width * totalScale;
  const frameHeight = height * totalScale;

  const getFocalBannerPoint = useCallback(
    (clientX?: number, clientY?: number): { x: number; y: number } => {
      const frame = frameRef.current;
      const currentZoom = viewZoomRef.current;
      const scale = fitScale * currentZoom;

      if (frame && clientX !== undefined && clientY !== undefined) {
        const rect = frame.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          return {
            x: (clientX - rect.left) / scale,
            y: (clientY - rect.top) / scale,
          };
        }
      }

      const currentLayout = layoutRef.current;
      const slotId = selectedSlotIdRef.current;
      if (slotId) {
        const layer = currentLayout.layerBySlot[slotId];
        if (layer?.visible) {
          return {
            x: ((layer.rect.left + layer.rect.width / 2) / 100) * width,
            y: ((layer.rect.top + layer.rect.height / 2) / 100) * height,
          };
        }
      }

      return { x: width / 2, y: height / 2 };
    },
    [fitScale, width, height],
  );

  const applyZoom = useCallback(
    (nextZoom: number, clientX?: number, clientY?: number) => {
      const viewport = viewportRef.current;
      const frame = frameRef.current;
      const oldZoom = viewZoomRef.current;
      const clamped = clampZoom(nextZoom);
      if (clamped === oldZoom) return;

      if (!viewport || !frame) {
        onViewZoomChange(clamped);
        return;
      }

      const oldScale = fitScale * oldZoom;
      const focal = getFocalBannerPoint(clientX, clientY);
      const focalInFrameOldX = focal.x * oldScale;
      const focalInFrameOldY = focal.y * oldScale;

      let anchorClientX = clientX;
      let anchorClientY = clientY;
      if (anchorClientX === undefined || anchorClientY === undefined) {
        const frameRect = frame.getBoundingClientRect();
        anchorClientX = frameRect.left + focalInFrameOldX;
        anchorClientY = frameRect.top + focalInFrameOldY;
      }

      const ratioX = oldScale > 0 ? focal.x / width : 0.5;
      const ratioY = oldScale > 0 ? focal.y / height : 0.5;

      onViewZoomChange(clamped);

      requestAnimationFrame(() => {
        const nextFrame = frameRef.current;
        const nextViewport = viewportRef.current;
        if (!nextFrame || !nextViewport) return;
        const nextFrameWidth = width * fitScale * clamped;
        const nextFrameHeight = height * fitScale * clamped;
        const nextViewportRect = nextViewport.getBoundingClientRect();
        const pointerX = anchorClientX! - nextViewportRect.left;
        const pointerY = anchorClientY! - nextViewportRect.top;
        nextViewport.scrollLeft = ratioX * nextFrameWidth - pointerX;
        nextViewport.scrollTop = ratioY * nextFrameHeight - pointerY;
      });
    },
    [fitScale, getFocalBannerPoint, height, onViewZoomChange, width],
  );

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
    requestAnimationFrame(() => {
      const nextViewport = viewportRef.current;
      if (!nextViewport) return;
      nextViewport.scrollLeft = Math.max(0, (nextViewport.scrollWidth - nextViewport.clientWidth) / 2);
      nextViewport.scrollTop = Math.max(0, (nextViewport.scrollHeight - nextViewport.clientHeight) / 2);
    });
  }, [fitScale, height, onViewZoomChange, width]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      applyZoom(viewZoomRef.current + delta, e.clientX, e.clientY);
    },
    [applyZoom],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  function patchLayer(slotId: ClassicEditableSlotId, patch: Partial<ClassicBannerLayerOverride>) {
    onLayerOverride(slotId, patch);
  }

  function resolveBackgroundTransform(
    layer: ClassicBannerResolvedLayer,
  ): ClassicBackgroundTransform {
    const dims = resolvedImageDimensions.background;
    const hasRectOverride = classicBannerSlotHasRectOverride(
      data,
      variant.sizeId,
      "background",
    );
    return resolveClassicBackgroundTransform({
      baseRect: layer.rect,
      hasManualRectOverride: hasRectOverride,
      bannerWidth: width,
      bannerHeight: height,
      imageWidth: dims?.width,
      imageHeight: dims?.height,
    });
  }

  function renderLayerContent(
    slotId: ClassicEditableSlotId,
    backgroundTransform?: ClassicBackgroundTransform,
  ) {
    switch (slotId) {
      case "background":
        return hasClassicBannerImageSource(content, "background") && imageUrls.background ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrls.background}
            alt=""
            className={
              backgroundTransform?.useIntrinsicCoverFit
                ? "h-full w-full object-cover"
                : "h-full w-full"
            }
          />
        ) : null;
      case "hero":
        return imageUrls.hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrls.hero} alt="" className="h-full w-full" />
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
          <img src={imageUrls.logo} alt="Logo" className="h-full w-full" />
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

  function getLayerImageChrome(layer: ClassicBannerResolvedLayer) {
    if (layer.slotId === "background") {
      const dims = resolvedImageDimensions.background;
      const transform = resolveBackgroundTransform(layer);
      return {
        chromeRect: transform.imageRect,
        interactionRect: transform.imageRect,
        imageAspect: dims ? dims.width / dims.height : undefined,
      };
    }

    if (layer.slotId !== "logo" && layer.slotId !== "hero") {
      return { chromeRect: undefined, interactionRect: undefined, imageAspect: undefined };
    }
    const dims = resolvedImageDimensions[layer.slotId];
    const chromeRect = resolveImageChromeRect(
      layer.slotId,
      layer.rect,
      dims,
      width,
      height,
      layout.logoMaxHeight,
    );
    return {
      chromeRect,
      interactionRect: undefined,
      imageAspect: dims ? dims.width / dims.height : undefined,
    };
  }

  function getLayerDisplayRect(layer: ClassicBannerResolvedLayer): ClassicBannerLayoutRect {
    if (layer.slotId === "background") {
      const { chromeRect } = getLayerImageChrome(layer);
      return chromeRect ?? layer.rect;
    }
    const { chromeRect } = getLayerImageChrome(layer);
    return chromeRect ?? layer.rect;
  }

  function layerPointerEvents(layer: ClassicBannerResolvedLayer): "auto" | "none" {
    if (layer.slotId === "background" && selectedSlotId !== "background") {
      return "none";
    }
    return "auto";
  }

  function layerContentWrapper(slotId: ClassicEditableSlotId, children: React.ReactNode) {
    if (slotId === "hero") {
      if (resolvedImageDimensions.hero) {
        return <div className="h-full w-full">{children}</div>;
      }
      return <div className="flex h-full w-full items-center justify-center">{children}</div>;
    }
    if (slotId === "logo") {
      if (resolvedImageDimensions.logo) {
        return <div className="h-full w-full">{children}</div>;
      }
      return (
        <div className="flex h-full w-full items-start justify-start">
          <div className="max-h-full max-w-full" style={{ maxHeight: layout.logoMaxHeight }}>
            {children}
          </div>
        </div>
      );
    }
    if (slotId === "background") {
      return <div className="h-full w-full">{children}</div>;
    }
    if (slotId === "cta") {
      return <div className="flex h-full w-full items-end">{children}</div>;
    }
    if (slotId === "badge") {
      return <div className="flex h-full w-full items-start justify-end">{children}</div>;
    }
    return children;
  }

  return (
    <div className="flex h-full min-h-0 w-full max-w-full flex-col">
      <div className="shrink-0 border-b border-zinc-800/60 bg-zinc-950/90 px-3 py-2 backdrop-blur-sm">
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ClassicCanvasToolbar
            zoom={viewZoom}
            onZoomOut={() => applyZoom(viewZoom - ZOOM_STEP)}
            onZoomIn={() => applyZoom(viewZoom + ZOOM_STEP)}
            onZoomReset={() => applyZoom(1)}
            onFitToView={handleFitToView}
          />
          <p className="shrink-0 text-center font-mono text-xs text-zinc-400 sm:text-right">
            {width}×{height} · náhled {Math.round(totalScale * 100)}%
          </p>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const frame = frameRef.current;
          if (!frame) {
            onSelectSlot(null);
            return;
          }
          const rect = frame.getBoundingClientRect();
          const inside =
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom;
          if (!inside) {
            onSelectSlot(null);
          }
        }}
      >
        <div
          ref={frameRef}
          className="relative shrink-0"
          style={{ width: frameWidth, height: frameHeight }}
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
          >
            <div className="absolute inset-0 overflow-hidden rounded-lg border border-zinc-700/80 bg-zinc-900 shadow-xl">
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: designTokens.primaryColor,
                  zIndex: -1,
                  pointerEvents: "none",
                }}
              />

              <div
                className="absolute inset-0"
                style={{ zIndex: 0 }}
                aria-hidden
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  const bg = layout.layerBySlot.background;
                  if (bg.visible) {
                    onSelectSlot("background");
                  } else {
                    onSelectSlot(null);
                  }
                }}
              />

              {canvasLayers.map((layer) => {
                const displayRect = getLayerDisplayRect(layer);
                const backgroundTransform =
                  layer.slotId === "background"
                    ? resolveBackgroundTransform(layer)
                    : undefined;
                return (
                  <div
                    key={`${layer.slotId}-content`}
                    className="pointer-events-none"
                    style={layerTransformStyle(
                      displayRect,
                      layer.zIndex,
                      layer.rotationDeg,
                    )}
                  >
                    {layerContentWrapper(
                      layer.slotId,
                      renderLayerContent(layer.slotId, backgroundTransform),
                    )}
                  </div>
                );
              })}
            </div>

            <SnapGuideOverlay guides={activeSnapGuides} />

            <div className="absolute inset-0 overflow-visible">
              {canvasLayers.map((layer) => {
                const { chromeRect, interactionRect, imageAspect } = getLayerImageChrome(layer);
                return (
                  <InteractiveLayer
                    key={layer.slotId}
                    layer={layer}
                    selected={selectedSlotId === layer.slotId}
                    bannerWidth={width}
                    bannerHeight={height}
                    canvasScale={totalScale}
                    chromeRect={chromeRect}
                    interactionRect={interactionRect}
                    imageAspect={imageAspect}
                    onSelect={() => onSelectSlot(layer.slotId)}
                    onRectChange={(rect) => patchLayer(layer.slotId, { rect })}
                    onRotationChange={(rotationDeg) => patchLayer(layer.slotId, { rotationDeg })}
                    pointerEvents={layerPointerEvents(layer)}
                    finalLayout={layout}
                    onSnapGuidesChange={setActiveSnapGuides}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
