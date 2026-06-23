"use client";

import { useState } from "react";
import type { QuickAddLayerType } from "@/lib/animation/layer-factory";

interface CanvasQuickAddProps {
  onAdd: (kind: QuickAddLayerType) => void;
}

const ITEMS: { kind: QuickAddLayerType; label: string }[] = [
  { kind: "text", label: "Text" },
  { kind: "logo", label: "Logo" },
  { kind: "product", label: "Produkt / obrázek" },
  { kind: "cta", label: "CTA tlačítko" },
  { kind: "badge", label: "Odznak" },
  { kind: "underline", label: "Podtržení" },
  { kind: "particle", label: "Částice" },
  { kind: "shape", label: "Tvar" },
];

export function CanvasQuickAdd({ onAdd }: CanvasQuickAddProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-violet-700/50 bg-violet-950/40 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-900/40"
      >
        + Přidat
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Zavřít menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
            {ITEMS.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  onAdd(kind);
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
