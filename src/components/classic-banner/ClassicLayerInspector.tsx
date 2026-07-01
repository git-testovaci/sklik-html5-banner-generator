"use client";

import {
  CLASSIC_SLOT_CZECH_NAMES,
} from "@/lib/classic-banner/classic-banner-selection";
import {
  patchClassicBannerLayerOverride,
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
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
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
        value={Math.round(value * 10) / 10}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-100"
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

  function emit(next: ClassicBannerProjectData) {
    onChange(prepareClassicBannerData(next));
  }

  function patch(patch: Partial<ClassicBannerLayerOverride>) {
    emit(patchClassicBannerLayerOverride(data, sizeId, selectedSlotId!, patch));
  }

  function updateRect(field: "left" | "top" | "width" | "height", value: number) {
    patch({ rect: { [field]: value } });
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
          onChange={(left) => updateRect("left", left)}
        />
        <NumberField
          id="layer-y"
          label="Y (%)"
          value={layer.rect.top}
          onChange={(top) => updateRect("top", top)}
        />
        <NumberField
          id="layer-w"
          label="Šířka (%)"
          value={layer.rect.width}
          onChange={(width) => updateRect("width", width)}
        />
        <NumberField
          id="layer-h"
          label="Výška (%)"
          value={layer.rect.height}
          onChange={(height) => updateRect("height", height)}
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
        <button
          type="button"
          disabled
          title="Připravuje se v další fázi"
          className="rounded border border-zinc-800 px-2 py-1 text-xs text-zinc-600"
        >
          Přenést styl na podobné rozměry
        </button>
      </div>
    </div>
  );
}
