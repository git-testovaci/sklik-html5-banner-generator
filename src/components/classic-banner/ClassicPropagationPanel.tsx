"use client";

import { useMemo, useState } from "react";
import {
  CLASSIC_SLOT_CZECH_NAMES,
} from "@/lib/classic-banner/classic-banner-selection";
import {
  getClassicBannerPropagationTargets,
  getClassicBannerSourcePropagationSlots,
  getDefaultPropagationSelectedSizeIds,
  previewClassicBannerPropagation,
  propagateClassicBannerOverrides,
  resetClassicBannerSimilarOverrides,
  sanitizePropagationSelectedSizeIds,
  suggestPropagationTransformMode,
  type ClassicBannerPropagationTargetMode,
  type ClassicBannerPropagationTransformMode,
} from "@/lib/classic-banner/classic-banner-propagation";
import { prepareClassicBannerData } from "@/lib/classic-banner/classic-banner-update";
import type {
  ClassicBannerOnChange,
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicEditableSlotId,
} from "@/types/classic-banner";

interface ClassicPropagationPanelProps {
  data: ClassicBannerProjectData;
  variant: ClassicBannerSizeVariant;
  selectedSlotId: ClassicEditableSlotId | null;
  onChange: ClassicBannerOnChange;
}

const TARGET_MODE_LABELS: Record<ClassicBannerPropagationTargetMode, string> = {
  "same-family": "Na všechny rozměry stejné rodiny",
  all: "Na všechny rozměry",
  "selected-sizes": "Vybrané rozměry",
};

const TRANSFORM_MODE_LABELS: Record<ClassicBannerPropagationTransformMode, string> = {
  "copy-percent": "Kopírovat přesně podle procent",
  "family-aware": "Přizpůsobit podle typu rozměru",
};

const FAMILY_LABELS: Record<string, string> = {
  vertical: "svislá",
  square: "čtverec",
  landscape: "na šířku",
  mobile: "mobil",
  portrait: "portrét",
  interscroller: "interscroller",
};

export function ClassicPropagationPanel({
  data,
  variant,
  selectedSlotId,
  onChange,
}: ClassicPropagationPanelProps) {
  const [targetMode, setTargetMode] =
    useState<ClassicBannerPropagationTargetMode>("same-family");
  const [boundSourceId, setBoundSourceId] = useState(variant.sizeId);
  const [manualSelection, setManualSelection] = useState<string[] | null>(null);
  const [transformMode, setTransformMode] =
    useState<ClassicBannerPropagationTransformMode>("copy-percent");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState(false);

  if (boundSourceId !== variant.sizeId) {
    setBoundSourceId(variant.sizeId);
    setManualSelection(null);
    setTransformMode("copy-percent");
    setTargetMode("same-family");
  }

  const defaultSelectedIds = useMemo(
    () => getDefaultPropagationSelectedSizeIds(data, variant),
    [data, variant],
  );

  const selectedSizeIds = manualSelection ?? defaultSelectedIds;

  const effectiveSelectedSizeIds = useMemo(
    () => sanitizePropagationSelectedSizeIds(data, variant.sizeId, selectedSizeIds),
    [data, variant.sizeId, selectedSizeIds],
  );

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
    () =>
      getClassicBannerPropagationTargets(
        data,
        variant,
        targetMode,
        targetMode === "selected-sizes" ? effectiveSelectedSizeIds : undefined,
      ),
    [data, variant, targetMode, effectiveSelectedSizeIds],
  );

  const propagationOptions = useMemo(
    () => ({
      targetMode,
      selectedSizeIds:
        targetMode === "selected-sizes" ? effectiveSelectedSizeIds : undefined,
      overwriteExisting,
      transformMode,
      slots: selectedSlotId ? [selectedSlotId] : undefined,
    }),
    [
      targetMode,
      effectiveSelectedSizeIds,
      overwriteExisting,
      transformMode,
      selectedSlotId,
    ],
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
    const nextTargets = getClassicBannerPropagationTargets(
      data,
      variant,
      mode,
      mode === "selected-sizes" ? effectiveSelectedSizeIds : undefined,
    );
    setTransformMode(
      suggestPropagationTransformMode(
        mode,
        variant,
        nextTargets.map((target) => target.variant),
      ),
    );
    if (mode === "selected-sizes" && effectiveSelectedSizeIds.length === 0) {
      setManualSelection(getDefaultPropagationSelectedSizeIds(data, variant));
    }
  }

  function toggleSelectedSize(sizeId: string) {
    setManualSelection((current) => {
      const base = current ?? defaultSelectedIds;
      const sanitized = sanitizePropagationSelectedSizeIds(data, variant.sizeId, base);
      const next = sanitized.includes(sizeId)
        ? sanitized.filter((id) => id !== sizeId)
        : [...sanitized, sizeId];
      const nextTargets = getClassicBannerPropagationTargets(
        data,
        variant,
        "selected-sizes",
        next,
      );
      setTransformMode(
        suggestPropagationTransformMode(
          "selected-sizes",
          variant,
          nextTargets.map((target) => target.variant),
        ),
      );
      return next;
    });
  }

  function selectAllInFamily() {
    const next = getDefaultPropagationSelectedSizeIds(data, variant);
    setManualSelection(next);
    setTransformMode("copy-percent");
  }

  function clearSelectedSizes() {
    setManualSelection([]);
  }

  const canPropagate =
    slotsToPropagate.length > 0 &&
    targets.length > 0 &&
    (targetMode !== "selected-sizes" || effectiveSelectedSizeIds.length > 0);

  function showStatus(message: string, isError: boolean) {
    setStatusMessage(message);
    setStatusIsError(isError);
    window.setTimeout(() => setStatusMessage(null), 6000);
  }

  function handlePropagate() {
    const result = propagateClassicBannerOverrides(data, variant.sizeId, propagationOptions);
    onChange(prepareClassicBannerData(result.data), { history: "push" });
    showStatus(
      result.message,
      result.updatedTargetCount === 0 && result.skippedSlotCount === 0,
    );
  }

  function handleResetSimilar() {
    const slotScope = selectedSlotId ? [selectedSlotId] : undefined;
    const targetLabel =
      targetMode === "selected-sizes"
        ? `${effectiveSelectedSizeIds.length} vybraných rozměrů`
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
      selectedSizeIds:
        targetMode === "selected-sizes" ? effectiveSelectedSizeIds : undefined,
      slots: slotScope,
    });
    onChange(prepareClassicBannerData(result.data), { history: "push" });
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
            <span className="text-zinc-500">Cíl:</span> {TARGET_MODE_LABELS[preview.targetMode]}
          </p>
          <p>
            <span className="text-zinc-500">Transformace:</span>{" "}
            {TRANSFORM_MODE_LABELS[preview.transformMode]}
          </p>
          <p>
            <span className="text-zinc-500">Počet cílů:</span> {preview.targetCount}
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
              Aplikuje se {preview.potentialApplyCount} úprav.
            </p>
          ) : null}
        </div>
      ) : null}

      {targetMode === "all" ? (
        <p className="mt-2 text-[10px] text-amber-400/90">
          Různé poměry stran mohou vyžadovat ruční doladění.
        </p>
      ) : transformMode === "family-aware" ? (
        <p className="mt-2 text-[10px] text-zinc-600">
          Pozice se přizpůsobí automatickému rozložení cílového rozměru podle úprav zdroje.
        </p>
      ) : (
        <p className="mt-2 text-[10px] text-zinc-600">
          Procentní pozice se zkopírují beze změny — vhodné pro stejnou rodinu rozměrů.
        </p>
      )}

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

        <label
          htmlFor="classic-propagation-transform-mode"
          className="mb-1 block text-[11px] text-zinc-500"
        >
          Transformace
        </label>
        <select
          id="classic-propagation-transform-mode"
          value={transformMode}
          onChange={(e) =>
            setTransformMode(e.target.value as ClassicBannerPropagationTransformMode)
          }
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
        >
          <option value="copy-percent">{TRANSFORM_MODE_LABELS["copy-percent"]}</option>
          <option value="family-aware">{TRANSFORM_MODE_LABELS["family-aware"]}</option>
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
                const checked = effectiveSelectedSizeIds.includes(item.sizeId);
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
            : targetMode === "selected-sizes" && effectiveSelectedSizeIds.length === 0
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
