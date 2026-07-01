"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CLASSIC_SLOT_CZECH_NAMES,
} from "@/lib/classic-banner/classic-banner-selection";
import {
  CLASSIC_BACKGROUND_MIN_SIZE,
  CLASSIC_BACKGROUND_RECT_MAX_HEIGHT,
  CLASSIC_BACKGROUND_RECT_MAX_WIDTH,
  CLASSIC_BACKGROUND_RECT_MIN_LEFT,
  CLASSIC_BACKGROUND_RECT_MIN_TOP,
  clampClassicBannerLayerRect,
  clampClassicBannerRotation,
  classicBannerSlotHasRectOverride,
  getClassicLayerReorderState,
  patchClassicBannerLayerOverride,
  reorderClassicBannerLayer,
  resetAllClassicBannerVariantOverrides,
  resetClassicBannerLayerOverride,
  resetClassicBannerVariantOverrides,
  resolveClassicBannerFinalLayout,
} from "@/lib/classic-banner/classic-banner-overrides";
import {
  getClassicBannerImageDimensionsFromAssets,
  resolveClassicBannerImageDimensionsMap,
  type ClassicBannerImageDimensions,
} from "@/lib/classic-banner/classic-banner-image-sources";
import { resolveClassicBackgroundTransform } from "@/lib/classic-banner/classic-banner-image-fit";
import { prepareClassicBannerData } from "@/lib/classic-banner/classic-banner-update";
import type { BannerAsset } from "@/types/assets";
import type {
  ClassicBannerLayerOverride,
  ClassicBannerEditorChangeOptions,
  ClassicBannerOnChange,
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicEditableSlotId,
} from "@/types/classic-banner";
import type { ClassicLayerReorderAction, ClassicLayerReorderState } from "@/lib/classic-banner/classic-banner-overrides";

interface ClassicLayerInspectorProps {
  data: ClassicBannerProjectData;
  variant: ClassicBannerSizeVariant;
  selectedSlotId: ClassicEditableSlotId | null;
  assets?: BannerAsset[];
  onChange: ClassicBannerOnChange;
}

function NumberField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  min,
  max,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[11px] text-zinc-500">
        {label}
      </label>
      <input
        id={id}
        type="number"
        step={0.1}
        min={min}
        max={max}
        disabled={disabled}
        value={Math.round(value * 10) / 10}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isFinite(next)) return;
          onChange(next);
        }}
        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-100 disabled:opacity-50"
      />
    </div>
  );
}

function OrderButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

export function ClassicLayerOrderControls({
  slotId,
  reorderState,
  onReorder,
  layout = "full",
}: {
  slotId: ClassicEditableSlotId;
  reorderState: ClassicLayerReorderState;
  onReorder: (action: ClassicLayerReorderAction) => void;
  layout?: "compact" | "full";
}) {
  if (slotId === "background") {
    return (
      <p className="text-[11px] text-zinc-500">
        Pořadí pozadí je vždy vzadu a nelze ho měnit.
      </p>
    );
  }

  const { isFrontmost, isBackmost, canReorder } = reorderState;
  const disabled = !canReorder;

  if (layout === "compact") {
    return (
      <div className="flex flex-wrap gap-1">
        <OrderButton
          label="↑"
          disabled={disabled || isFrontmost}
          onClick={() => onReorder("forward")}
        />
        <OrderButton
          label="↓"
          disabled={disabled || isBackmost}
          onClick={() => onReorder("backward")}
        />
        <OrderButton
          label="Vpřed"
          disabled={disabled || isFrontmost}
          onClick={() => onReorder("front")}
        />
        <OrderButton
          label="Dozadu"
          disabled={disabled || isBackmost}
          onClick={() => onReorder("back")}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <OrderButton
        label="Posunout dopředu"
        disabled={disabled || isFrontmost}
        onClick={() => onReorder("forward")}
      />
      <OrderButton
        label="Posunout dozadu"
        disabled={disabled || isBackmost}
        onClick={() => onReorder("backward")}
      />
      <OrderButton
        label="Do popředí"
        disabled={disabled || isFrontmost}
        onClick={() => onReorder("front")}
      />
      <OrderButton
        label="Do pozadí"
        disabled={disabled || isBackmost}
        onClick={() => onReorder("back")}
      />
    </div>
  );
}

export function ClassicLayerInspector({
  data,
  variant,
  selectedSlotId,
  assets = [],
  onChange,
}: ClassicLayerInspectorProps) {
  const [urlBackgroundDims, setUrlBackgroundDims] = useState<ClassicBannerImageDimensions | null>(
    null,
  );

  const assetBackgroundDims = useMemo(
    () => getClassicBannerImageDimensionsFromAssets(data.content, "background", assets),
    [assets, data.content],
  );

  useEffect(() => {
    let cancelled = false;
    void resolveClassicBannerImageDimensionsMap(data.content, assets).then((resolved) => {
      if (cancelled) return;
      setUrlBackgroundDims(resolved.background);
    });
    return () => {
      cancelled = true;
    };
  }, [assets, data.content]);

  if (!selectedSlotId) {
    return (
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <p className="text-xs text-zinc-500">
          Klikněte na vrstvu v náhledu nebo v seznamu vrstev pro úpradu pozice.
        </p>
      </div>
    );
  }

  const finalLayout = resolveClassicBannerFinalLayout(data, variant);
  const layer = finalLayout.layerBySlot[selectedSlotId];
  const sizeId = variant.sizeId;
  const reorderState = getClassicLayerReorderState(finalLayout, selectedSlotId);

  const backgroundDims = assetBackgroundDims ?? urlBackgroundDims;
  const isBackground = selectedSlotId === "background";
  const backgroundHasRectOverride = classicBannerSlotHasRectOverride(data, sizeId, "background");
  const editableRect = isBackground
    ? resolveClassicBackgroundTransform({
        baseRect: layer.rect,
        hasManualRectOverride: backgroundHasRectOverride,
        bannerWidth: variant.width,
        bannerHeight: variant.height,
        imageWidth: backgroundDims?.width,
        imageHeight: backgroundDims?.height,
      }).imageRect
    : layer.rect;

  function emit(next: ClassicBannerProjectData, options?: ClassicBannerEditorChangeOptions) {
    onChange(prepareClassicBannerData(next), options);
  }

  function patch(patch: Partial<ClassicBannerLayerOverride>, options?: ClassicBannerEditorChangeOptions) {
    emit(patchClassicBannerLayerOverride(data, sizeId, selectedSlotId!, patch), options);
  }

  function handleReorder(action: Parameters<typeof reorderClassicBannerLayer>[3]) {
    emit(reorderClassicBannerLayer(data, variant, selectedSlotId!, action), { history: "push" });
  }

  function updateRect(field: "left" | "top" | "width" | "height", value: number) {
    if (!Number.isFinite(value)) return;
    const nextRect = clampClassicBannerLayerRect(selectedSlotId!, {
      left: field === "left" ? value : editableRect.left,
      top: field === "top" ? value : editableRect.top,
      width: field === "width" ? value : editableRect.width,
      height: field === "height" ? value : editableRect.height,
    });
    patch({ rect: nextRect }, { history: "replace" });
  }

  const rectFieldBounds = isBackground
    ? {
        left: { min: CLASSIC_BACKGROUND_RECT_MIN_LEFT, max: 100 },
        top: { min: CLASSIC_BACKGROUND_RECT_MIN_TOP, max: 100 },
        width: { min: CLASSIC_BACKGROUND_MIN_SIZE, max: CLASSIC_BACKGROUND_RECT_MAX_WIDTH },
        height: { min: CLASSIC_BACKGROUND_MIN_SIZE, max: CLASSIC_BACKGROUND_RECT_MAX_HEIGHT },
      }
    : {
        left: { min: 0, max: 100 },
        top: { min: 0, max: 100 },
        width: { min: 2, max: 100 },
        height: { min: 2, max: 100 },
      };

  function updateRotation(value: number) {
    if (!Number.isFinite(value)) return;
    patch({ rotationDeg: clampClassicBannerRotation(value) }, { history: "replace" });
  }

  return (
    <div className="border-b border-zinc-800/80 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-200">
          {CLASSIC_SLOT_CZECH_NAMES[selectedSlotId]}
        </h3>
        {layer.hasOverride ? (
          <span className="rounded bg-violet-950/60 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
            Ruční úprava
          </span>
        ) : (
          <span className="text-[10px] text-zinc-500">Automatické rozložení</span>
        )}
      </div>

      <p className="mb-3 text-[11px] text-amber-400/90">Ruční úpravy platí pro aktuální rozměr.</p>

      {isBackground ? (
        <p className="mb-3 text-[11px] text-zinc-500">
          Pozadí je obrázek pod pevným výřezem banneru. Může přesahovat mimo banner; export se
          ořízne.
        </p>
      ) : null}

      <div className="space-y-2">
        <label className="flex items-center justify-between rounded border border-zinc-800/60 px-2 py-1.5 text-sm text-zinc-300">
          <span>Viditelnost</span>
          <input
            type="checkbox"
            checked={layer.visible}
            onChange={(e) => patch({ visible: e.target.checked }, { history: "push" })}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-violet-600"
          />
        </label>
        <label className="flex items-center justify-between rounded border border-zinc-800/60 px-2 py-1.5 text-sm text-zinc-300">
          <span>Zamknout</span>
          <input
            type="checkbox"
            checked={layer.locked}
            onChange={(e) => patch({ locked: e.target.checked }, { history: "push" })}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-violet-600"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <NumberField
          id="layer-x"
          label="X (%)"
          value={editableRect.left}
          disabled={layer.locked}
          min={rectFieldBounds.left.min}
          max={rectFieldBounds.left.max}
          onChange={(left) => updateRect("left", left)}
        />
        <NumberField
          id="layer-y"
          label="Y (%)"
          value={editableRect.top}
          disabled={layer.locked}
          min={rectFieldBounds.top.min}
          max={rectFieldBounds.top.max}
          onChange={(top) => updateRect("top", top)}
        />
        <NumberField
          id="layer-w"
          label="Šířka (%)"
          value={editableRect.width}
          disabled={layer.locked}
          min={rectFieldBounds.width.min}
          max={rectFieldBounds.width.max}
          onChange={(width) => updateRect("width", width)}
        />
        <NumberField
          id="layer-h"
          label="Výška (%)"
          value={editableRect.height}
          disabled={layer.locked}
          min={rectFieldBounds.height.min}
          max={rectFieldBounds.height.max}
          onChange={(height) => updateRect("height", height)}
        />
      </div>

      <div className="mt-4">
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Rotace
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              id="layer-rotation"
              type="range"
              min={-180}
              max={180}
              step={1}
              disabled={layer.locked}
              value={layer.rotationDeg}
              onChange={(e) => updateRotation(Number(e.target.value))}
              className="min-w-0 flex-1 disabled:opacity-50"
            />
            <input
              type="number"
              min={-180}
              max={180}
              step={1}
              disabled={layer.locked}
              value={Math.round(layer.rotationDeg)}
              onChange={(e) => updateRotation(Number(e.target.value))}
              className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1 py-1 text-center font-mono text-xs text-zinc-100 disabled:opacity-50"
              aria-label="Rotace ve stupních"
            />
            <span className="text-xs text-zinc-500">°</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={layer.locked}
              onClick={() => updateRotation(layer.rotationDeg - 15)}
              className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              −15°
            </button>
            <button
              type="button"
              disabled={layer.locked}
              onClick={() => updateRotation(layer.rotationDeg + 15)}
              className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              +15°
            </button>
            <button
              type="button"
              disabled={layer.locked || layer.rotationDeg === 0}
              onClick={() => patch({ rotationDeg: 0 }, { history: "push" })}
              className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              Reset rotace
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Pořadí vrstvy
        </h4>
        <ClassicLayerOrderControls
          slotId={selectedSlotId}
          reorderState={reorderState}
          onReorder={handleReorder}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => emit(resetClassicBannerLayerOverride(data, sizeId, selectedSlotId), { history: "push" })}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Reset vrstvy
        </button>
        <button
          type="button"
          onClick={() => emit(resetClassicBannerVariantOverrides(data, sizeId), { history: "push" })}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Reset rozměru
        </button>
        <button
          type="button"
          onClick={() => emit(resetAllClassicBannerVariantOverrides(data), { history: "push" })}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Reset všech
        </button>
      </div>
    </div>
  );
}
