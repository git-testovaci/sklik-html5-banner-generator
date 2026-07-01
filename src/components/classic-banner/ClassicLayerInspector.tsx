"use client";

import {
  CLASSIC_SLOT_CZECH_NAMES,
} from "@/lib/classic-banner/classic-banner-selection";
import {
  getClassicLayerReorderState,
  patchClassicBannerLayerOverride,
  reorderClassicBannerLayer,
  resetAllClassicBannerVariantOverrides,
  resetClassicBannerLayerOverride,
  resetClassicBannerVariantOverrides,
  resolveClassicBannerFinalLayout,
} from "@/lib/classic-banner/classic-banner-overrides";
import { prepareClassicBannerData } from "@/lib/classic-banner/classic-banner-update";
import type {
  ClassicBannerLayerOverride,
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicEditableSlotId,
} from "@/types/classic-banner";
import type { ClassicLayerReorderAction, ClassicLayerReorderState } from "@/lib/classic-banner/classic-banner-overrides";

interface ClassicLayerInspectorProps {
  data: ClassicBannerProjectData;
  variant: ClassicBannerSizeVariant;
  selectedSlotId: ClassicEditableSlotId | null;
  onChange: (next: ClassicBannerProjectData) => void;
}

function NumberField({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
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
        min={0}
        max={100}
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
  onChange,
}: ClassicLayerInspectorProps) {
  if (!selectedSlotId) {
    return (
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <p className="text-xs text-zinc-500">
          Klikněte na vrstvu v náhledu nebo v seznamu vrstev pro úpravu pozice.
        </p>
      </div>
    );
  }

  const finalLayout = resolveClassicBannerFinalLayout(data, variant);
  const layer = finalLayout.layerBySlot[selectedSlotId];
  const sizeId = variant.sizeId;
  const reorderState = getClassicLayerReorderState(finalLayout, selectedSlotId);

  function emit(next: ClassicBannerProjectData) {
    onChange(prepareClassicBannerData(next));
  }

  function patch(patch: Partial<ClassicBannerLayerOverride>) {
    emit(patchClassicBannerLayerOverride(data, sizeId, selectedSlotId!, patch));
  }

  function handleReorder(action: Parameters<typeof reorderClassicBannerLayer>[3]) {
    emit(reorderClassicBannerLayer(data, variant, selectedSlotId!, action));
  }

  function updateRect(field: "left" | "top" | "width" | "height", value: number) {
    if (!Number.isFinite(value)) return;
    patch({
      rect: {
        left: field === "left" ? value : layer.rect.left,
        top: field === "top" ? value : layer.rect.top,
        width: field === "width" ? value : layer.rect.width,
        height: field === "height" ? value : layer.rect.height,
      },
    });
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

      <div className="space-y-2">
        <label className="flex items-center justify-between rounded border border-zinc-800/60 px-2 py-1.5 text-sm text-zinc-300">
          <span>Viditelnost</span>
          <input
            type="checkbox"
            checked={layer.visible}
            onChange={(e) => patch({ visible: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-violet-600"
          />
        </label>
        <label className="flex items-center justify-between rounded border border-zinc-800/60 px-2 py-1.5 text-sm text-zinc-300">
          <span>Zamknout</span>
          <input
            type="checkbox"
            checked={layer.locked}
            onChange={(e) => patch({ locked: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-violet-600"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <NumberField
          id="layer-x"
          label="X (%)"
          value={layer.rect.left}
          disabled={layer.locked}
          onChange={(left) => updateRect("left", left)}
        />
        <NumberField
          id="layer-y"
          label="Y (%)"
          value={layer.rect.top}
          disabled={layer.locked}
          onChange={(top) => updateRect("top", top)}
        />
        <NumberField
          id="layer-w"
          label="Šířka (%)"
          value={layer.rect.width}
          disabled={layer.locked}
          onChange={(width) => updateRect("width", width)}
        />
        <NumberField
          id="layer-h"
          label="Výška (%)"
          value={layer.rect.height}
          disabled={layer.locked}
          onChange={(height) => updateRect("height", height)}
        />
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
          onClick={() => emit(resetClassicBannerLayerOverride(data, sizeId, selectedSlotId))}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Reset vrstvy
        </button>
        <button
          type="button"
          onClick={() => emit(resetClassicBannerVariantOverrides(data, sizeId))}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Reset rozměru
        </button>
        <button
          type="button"
          onClick={() => emit(resetAllClassicBannerVariantOverrides(data))}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Reset všech
        </button>
      </div>
    </div>
  );
}
