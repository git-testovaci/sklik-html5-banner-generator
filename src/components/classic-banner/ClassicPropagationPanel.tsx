"use client";

import { useMemo, useState } from "react";
import {
  CLASSIC_SLOT_CZECH_NAMES,
} from "@/lib/classic-banner/classic-banner-selection";
import {
  getClassicBannerPropagationTargets,
  getClassicBannerSourcePropagationSlots,
  propagateClassicBannerOverrides,
  type ClassicBannerPropagationTargetMode,
} from "@/lib/classic-banner/classic-banner-propagation";
import { prepareClassicBannerData } from "@/lib/classic-banner/classic-banner-update";
import type {
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicEditableSlotId,
} from "@/types/classic-banner";

interface ClassicPropagationPanelProps {
  data: ClassicBannerProjectData;
  variant: ClassicBannerSizeVariant;
  selectedSlotId: ClassicEditableSlotId | null;
  onChange: (next: ClassicBannerProjectData) => void;
}

const TARGET_MODE_LABELS: Record<ClassicBannerPropagationTargetMode, string> = {
  "same-family": "Na všechny rozměry stejné rodiny",
  all: "Na všechny rozměry",
  "selected-sizes": "Použít na vybrané rozměry",
};

export function ClassicPropagationPanel({
  data,
  variant,
  selectedSlotId,
  onChange,
}: ClassicPropagationPanelProps) {
  const [targetMode, setTargetMode] =
    useState<ClassicBannerPropagationTargetMode>("same-family");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);

  const slotsToPropagate = useMemo(
    () =>
      getClassicBannerSourcePropagationSlots(
        data,
        variant.sizeId,
        selectedSlotId ? [selectedSlotId] : undefined,
      ),
    [data, variant.sizeId, selectedSlotId],
  );

  const targets = useMemo(
    () => getClassicBannerPropagationTargets(data, variant, targetMode),
    [data, variant, targetMode],
  );

  const canPropagate = slotsToPropagate.length > 0 && targets.length > 0;

  const scopeLabel = selectedSlotId
    ? `Přenese se vrstva: ${CLASSIC_SLOT_CZECH_NAMES[selectedSlotId]}`
    : `Přenesou se všechny ručně upravené vrstvy (${slotsToPropagate.length})`;

  const targetCountLabel =
    targets.length === 1
      ? "Použije se na 1 podobný rozměr."
      : `Použije se na ${targets.length} podobné rozměry.`;

  function handlePropagate() {
    const result = propagateClassicBannerOverrides(data, variant.sizeId, {
      targetMode,
      overwriteExisting,
      slots: selectedSlotId ? [selectedSlotId] : undefined,
    });

    onChange(prepareClassicBannerData(result.data));
    setStatusMessage(result.message);
    setStatusIsError(result.updatedTargetCount === 0 && result.skippedSlotCount === 0);

    window.setTimeout(() => {
      setStatusMessage(null);
    }, 6000);
  }

  return (
    <div className="border-b border-zinc-800/80 px-4 py-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Přenést úpravy
      </h3>
      <p className="mt-1 text-[11px] text-zinc-500">{scopeLabel}</p>
      <p className="mt-0.5 text-[11px] text-zinc-500">{targetCountLabel}</p>
      <p className="mt-2 text-[10px] text-zinc-600">
        Procentní pozice se kopírují beze změny. U velmi odlišných poměrů stran může být potřeba
        ruční doladění.
      </p>

      <div className="mt-3 space-y-2">
        <label
          htmlFor="classic-propagation-target-mode"
          className="mb-1 block text-[11px] text-zinc-500"
        >
          Cíl
        </label>
        <select
          id="classic-propagation-target-mode"
          value={targetMode}
          onChange={(e) =>
            setTargetMode(e.target.value as ClassicBannerPropagationTargetMode)
          }
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
        >
          <option value="same-family">{TARGET_MODE_LABELS["same-family"]}</option>
          <option value="all">{TARGET_MODE_LABELS.all}</option>
        </select>

        <label className="flex items-center justify-between rounded border border-zinc-800/60 px-2 py-1.5 text-sm text-zinc-300">
          <span>Přepsat existující ruční úpravy</span>
          <input
            type="checkbox"
            checked={overwriteExisting}
            onChange={(e) => setOverwriteExisting(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-violet-600"
          />
        </label>
        {!overwriteExisting ? (
          <p className="text-[10px] text-zinc-600">
            Nepřepisovat ruční úpravy — existující ruční úpravy na cílových rozměrech zůstanou
            zachovány.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={handlePropagate}
        disabled={!canPropagate}
        className="mt-3 w-full rounded-lg border border-violet-800/60 bg-violet-950/40 px-3 py-2 text-sm font-medium text-violet-200 transition-colors hover:border-violet-700 hover:bg-violet-950/60 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Přenést úpravy na podobné rozměry
      </button>

      {!canPropagate ? (
        <p className="mt-2 text-[11px] text-zinc-600">
          {slotsToPropagate.length === 0
            ? "Nejdříve upravte vrstvu na tomto rozměru."
            : "Pro tento režim nejsou dostupné cílové rozměry."}
        </p>
      ) : null}

      {statusMessage ? (
        <p
          className={`mt-2 text-xs font-medium ${statusIsError ? "text-amber-400" : "text-emerald-400"}`}
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
