"use client";

import { useMemo, useState } from "react";
import {
  CLASSIC_SLOT_CZECH_NAMES,
} from "@/lib/classic-banner/classic-banner-selection";
import {
  getClassicBannerPropagationTargets,
  getClassicBannerSourcePropagationSlots,
  previewClassicBannerPropagation,
  propagateClassicBannerOverrides,
  resetClassicBannerSimilarOverrides,
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
  "selected-sizes": "Vybrané rozměry",
};

const FAMILY_LABELS: Record<string, string> = {
  vertical: "svislá",
  square: "čtverec",
  landscape: "na šířku",
  mobile: "mobil",
  portrait: "portrét",
  interscroller: "interscroller",
};

function sameFamilySizeIds(
  data: ClassicBannerProjectData,
  variant: ClassicBannerSizeVariant,
): string[] {
  return getClassicBannerPropagationTargets(data, variant, "same-family").map(
    (target) => target.sizeId,
  );
}

export function ClassicPropagationPanel({
  data,
  variant,
  selectedSlotId,
  onChange,
}: ClassicPropagationPanelProps) {
  const [targetMode, setTargetMode] =
    useState<ClassicBannerPropagationTargetMode>("same-family");
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>(() =>
    sameFamilySizeIds(data, variant),
  );
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

  const propagationOptions = useMemo(
    () => ({
      targetMode,
      selectedSizeIds: targetMode === "selected-sizes" ? selectedSizeIds : undefined,
      overwriteExisting,
      slots: selectedSlotId ? [selectedSlotId] : undefined,
    }),
    [targetMode, selectedSizeIds, overwriteExisting, selectedSlotId],
  );

  const targets = useMemo(
    () =>
      getClassicBannerPropagationTargets(
        data,
        variant,
        targetMode,
        targetMode === "selected-sizes" ? selectedSizeIds : undefined,
      ),
    [data, variant, targetMode, selectedSizeIds],
  );

  const preview = useMemo(
    () => previewClassicBannerPropagation(data, variant.sizeId, propagationOptions),
    [data, variant.sizeId, propagationOptions],
  );

  const pickerVariants = useMemo(
    () => data.variants.filter((item) => item.sizeId !== variant.sizeId),
    [data.variants, variant.sizeId],
  );

  function handleTargetModeChange(mode: ClassicBannerPropagationTargetMode) {
    setTargetMode(mode);
    if (mode === "selected-sizes") {
      setSelectedSizeIds((current) =>
        current.length > 0 ? current : sameFamilySizeIds(data, variant),
      );
    }
  }

  function toggleSelectedSize(sizeId: string) {
    setSelectedSizeIds((current) =>
      current.includes(sizeId)
        ? current.filter((id) => id !== sizeId)
        : [...current, sizeId],
    );
  }

  function selectAllInFamily() {
    setSelectedSizeIds(sameFamilySizeIds(data, variant));
  }

  function clearSelectedSizes() {
    setSelectedSizeIds([]);
  }

  const canPropagate =
    slotsToPropagate.length > 0 &&
    targets.length > 0 &&
    (targetMode !== "selected-sizes" || selectedSizeIds.length > 0);

  function showStatus(message: string, isError: boolean) {
    setStatusMessage(message);
    setStatusIsError(isError);
    window.setTimeout(() => setStatusMessage(null), 6000);
  }

  function handlePropagate() {
    const result = propagateClassicBannerOverrides(data, variant.sizeId, propagationOptions);
    onChange(prepareClassicBannerData(result.data));
    showStatus(
      result.message,
      result.updatedTargetCount === 0 && result.skippedSlotCount === 0,
    );
  }

  function handleResetSimilar() {
    const slotScope = selectedSlotId ? [selectedSlotId] : undefined;
    const targetLabel =
      targetMode === "selected-sizes"
        ? `${selectedSizeIds.length} vybraných rozměrů`
        : targetMode === "all"
          ? "všechny ostatní rozměry"
          : "podobné rozměry stejné rodiny";
    const slotLabel = selectedSlotId
      ? `vrstvu „${CLASSIC_SLOT_CZECH_NAMES[selectedSlotId]}“`
      : "všechny ruční úpravy";

    const confirmed = window.confirm(
      `Opravdu resetovat ${slotLabel} na ${targetLabel}? Zdrojový rozměr ${variant.sizeId} zůstane beze změny.`,
    );
    if (!confirmed) return;

    const result = resetClassicBannerSimilarOverrides(data, variant.sizeId, {
      targetMode,
      selectedSizeIds: targetMode === "selected-sizes" ? selectedSizeIds : undefined,
      slots: slotScope,
    });
    onChange(prepareClassicBannerData(result.data));
    showStatus(result.message, result.resetVariantCount === 0);
  }

  const slotScopeLabel = selectedSlotId
    ? CLASSIC_SLOT_CZECH_NAMES[selectedSlotId]
    : slotsToPropagate
        .map((slotId) => CLASSIC_SLOT_CZECH_NAMES[slotId])
        .join(", ") || "—";

  return (
    <div className="border-b border-zinc-800/80 px-4 py-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Přenést úpravy
      </h3>

      {preview && slotsToPropagate.length > 0 ? (
        <div className="mt-2 rounded border border-zinc-800/80 bg-zinc-950/50 px-2.5 py-2 text-[11px] text-zinc-400">
          <p>
            <span className="text-zinc-500">Zdroj:</span> {preview.sourceSizeId}
          </p>
          <p>
            <span className="text-zinc-500">Vrstvy:</span> {slotScopeLabel}
          </p>
          <p>
            <span className="text-zinc-500">Cíle:</span> {preview.targetCount} rozměr
            {preview.targetCount === 1 ? "" : "y"}
          </p>
          <p>
            <span className="text-zinc-500">Přepsat:</span>{" "}
            {preview.overwriteExisting ? "ano" : "ne"}
          </p>
          {!preview.overwriteExisting && preview.potentialSkipCount > 0 ? (
            <p className="text-amber-400/90">
              Přeskočí se až {preview.potentialSkipCount} existujících ručních úprav.
            </p>
          ) : null}
          {preview.potentialApplyCount > 0 ? (
            <p className="text-emerald-400/80">
              Aplikuje se na {preview.potentialApplyCount} úprav.
            </p>
          ) : null}
        </div>
      ) : null}

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
            handleTargetModeChange(e.target.value as ClassicBannerPropagationTargetMode)
          }
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
        >
          <option value="same-family">{TARGET_MODE_LABELS["same-family"]}</option>
          <option value="selected-sizes">{TARGET_MODE_LABELS["selected-sizes"]}</option>
          <option value="all">{TARGET_MODE_LABELS.all}</option>
        </select>

        {targetMode === "selected-sizes" ? (
          <div className="rounded border border-zinc-800/80 bg-zinc-950/40 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-zinc-400">Cílové rozměry</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={selectAllInFamily}
                  className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                >
                  Vybrat vše v rodině
                </button>
                <button
                  type="button"
                  onClick={clearSelectedSizes}
                  className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                >
                  Zrušit výběr
                </button>
              </div>
            </div>
            <ul className="max-h-36 space-y-1 overflow-y-auto">
              {pickerVariants.map((item) => {
                const checked = selectedSizeIds.includes(item.sizeId);
                return (
                  <li key={item.sizeId}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs text-zinc-300 hover:bg-zinc-800/50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelectedSize(item.sizeId)}
                        className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-900 text-violet-600"
                      />
                      <span className="font-mono">{item.sizeId}</span>
                      <span className="text-[10px] text-zinc-500">
                        {FAMILY_LABELS[item.family] ?? item.family}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

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

      <button
        type="button"
        onClick={handleResetSimilar}
        disabled={targets.length === 0}
        className="mt-2 w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Resetovat podobné rozměry
      </button>

      {!canPropagate ? (
        <p className="mt-2 text-[11px] text-zinc-600">
          {slotsToPropagate.length === 0
            ? "Nejdříve upravte vrstvu na tomto rozměru."
            : targetMode === "selected-sizes" && selectedSizeIds.length === 0
              ? "Vyberte alespoň jeden cílový rozměr."
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
