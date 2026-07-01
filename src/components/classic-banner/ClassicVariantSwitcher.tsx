"use client";

import {
  CLASSIC_BANNER_SIZES,
  classicBannerFamilyLabel,
  getClassicBannerSizeById,
} from "@/lib/classic-banner/classic-banner-sizes";
import type { ClassicBannerSizeVariant } from "@/types/classic-banner";

interface ClassicVariantSwitcherProps {
  variants: ClassicBannerSizeVariant[];
  selectedSizeId: string;
  onSelect: (sizeId: string) => void;
}

function NetworkBadges({ sizeId }: { sizeId: string }) {
  const size = getClassicBannerSizeById(sizeId);
  if (!size) return null;

  const items: { key: string; label: string; active: boolean }[] = [
    { key: "sklik", label: "Sklik", active: size.networks.sklik },
    { key: "google", label: "Google", active: size.networks.google },
    { key: "microsoft", label: "MS", active: size.networks.microsoft },
  ];

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {items.map(({ key, label, active }) => (
        <span
          key={key}
          className={`rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
            active
              ? "bg-violet-950/60 text-violet-300 ring-1 ring-violet-800/50"
              : "bg-zinc-900/60 text-zinc-600"
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function variantStatusLabel(variant: ClassicBannerSizeVariant): string {
  if (variant.status === "master") return "Hlavní";
  if (variant.layout.status === "ready") return "Odvozená";
  if (variant.status === "derived") return "Odvozená";
  return "Čeká";
}

export function ClassicVariantSwitcher({
  variants,
  selectedSizeId,
  onSelect,
}: ClassicVariantSwitcherProps) {
  const ordered = CLASSIC_BANNER_SIZES.map((size) =>
    variants.find((variant) => variant.sizeId === size.id),
  ).filter((variant): variant is ClassicBannerSizeVariant => Boolean(variant));

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800/80 px-3 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">Varianty</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{ordered.length} formátů</p>
      </div>
      <ul className="flex-1 overflow-y-auto p-2" role="listbox" aria-label="Velikosti banneru">
        {ordered.map((variant) => {
          const selected = variant.sizeId === selectedSizeId;
          const layoutReady = variant.layout.status === "ready";

          return (
            <li key={variant.sizeId}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(variant.sizeId)}
                className={`mb-1 w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  selected
                    ? "border-violet-600/80 bg-violet-950/40"
                    : "border-transparent bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-medium text-zinc-100">
                    {variant.sizeId}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      variant.status === "master"
                        ? "bg-amber-950/50 text-amber-300"
                        : layoutReady
                          ? "bg-emerald-950/40 text-emerald-400"
                          : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {variantStatusLabel(variant)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {classicBannerFamilyLabel(variant.family)}
                </p>
                <NetworkBadges sizeId={variant.sizeId} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
