"use client";

import {
  CLASSIC_SLOT_CZECH_NAMES,
} from "@/lib/classic-banner/classic-banner-selection";
import {
  reorderClassicBannerLayer,
  resolveClassicBannerFinalLayout,
  type ClassicLayerReorderAction,
} from "@/lib/classic-banner/classic-banner-overrides";
import type {
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
  ClassicEditableSlotId,
} from "@/types/classic-banner";

interface ClassicLayerListProps {
  data: ClassicBannerProjectData;
  variant: ClassicBannerSizeVariant;
  selectedSlotId: ClassicEditableSlotId | null;
  onSelectSlot: (slotId: ClassicEditableSlotId) => void;
  onChange: (next: ClassicBannerProjectData) => void;
}

function ReorderButton({
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
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {label}
    </button>
  );
}

export function ClassicLayerList({
  data,
  variant,
  selectedSlotId,
  onSelectSlot,
  onChange,
}: ClassicLayerListProps) {
  const finalLayout = resolveClassicBannerFinalLayout(data, variant);
  const ordered = [...finalLayout.layers].sort((a, b) => b.zIndex - a.zIndex);
  const ascOrdered = [...finalLayout.layers].sort((a, b) => a.zIndex - b.zIndex);

  function reorder(slotId: ClassicEditableSlotId, action: ClassicLayerReorderAction) {
    onChange(reorderClassicBannerLayer(data, variant, slotId, action));
  }

  function reorderState(slotId: ClassicEditableSlotId) {
    const index = ascOrdered.findIndex((layer) => layer.slotId === slotId);
    return {
      isFront: index === ascOrdered.length - 1,
      isBack: index === 0,
    };
  }

  return (
    <div className="flex flex-col border-t border-zinc-800/80">
      <div className="px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Vrstvy</h3>
        <p className="mt-0.5 text-[10px] text-zinc-600">Seřazeno podle z-indexu (nahoře = vpředu)</p>
      </div>
      <ul className="max-h-48 space-y-1 overflow-y-auto px-2 pb-3 lg:max-h-none">
        {ordered.map((layer) => {
          const selected = selectedSlotId === layer.slotId;
          const { isFront, isBack } = reorderState(layer.slotId);
          return (
            <li key={layer.slotId}>
              <button
                type="button"
                onClick={() => onSelectSlot(layer.slotId)}
                aria-current={selected ? "true" : undefined}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                  selected
                    ? "bg-violet-950/60 text-violet-100 ring-2 ring-violet-500/70"
                    : layer.visible
                      ? "text-zinc-300 hover:bg-zinc-800/60"
                      : "text-zinc-500 hover:bg-zinc-800/40"
                }`}
              >
                <span className="truncate">
                  {selected ? (
                    <span className="mr-1 text-violet-400" aria-hidden="true">
                      ▸
                    </span>
                  ) : null}
                  {CLASSIC_SLOT_CZECH_NAMES[layer.slotId]}
                  {!layer.visible ? (
                    <span className="ml-1 text-[10px] text-zinc-500">(skryto)</span>
                  ) : null}
                  {layer.locked ? (
                    <span
                      className="ml-1 text-[10px] font-medium text-amber-500"
                      title="Zamknuto"
                    >
                      🔒
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-zinc-500">z{layer.zIndex}</span>
              </button>
              {selected ? (
                <div className="mt-1 flex flex-wrap gap-1 px-1 pb-1">
                  <ReorderButton
                    label="↑"
                    disabled={isFront || layer.locked}
                    onClick={() => reorder(layer.slotId, "forward")}
                  />
                  <ReorderButton
                    label="↓"
                    disabled={isBack || layer.locked}
                    onClick={() => reorder(layer.slotId, "backward")}
                  />
                  <ReorderButton
                    label="Vpřed"
                    disabled={isFront || layer.locked}
                    onClick={() => reorder(layer.slotId, "front")}
                  />
                  <ReorderButton
                    label="Dozadu"
                    disabled={isBack || layer.locked}
                    onClick={() => reorder(layer.slotId, "back")}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
