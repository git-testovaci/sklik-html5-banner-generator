"use client";

import { useState } from "react";
import type { QuickAddLayerType } from "@/lib/animation/layer-factory";

interface CanvasQuickAddProps {
  onAdd: (kind: QuickAddLayerType) => void;
}

const PRIMARY: { kind: QuickAddLayerType; label: string }[] = [
  { kind: "text", label: "Přidat text" },
  { kind: "headline", label: "Přidat nadpis" },
  { kind: "subheadline", label: "Přidat podnadpis" },
  { kind: "cta", label: "Přidat CTA" },
  { kind: "badge", label: "Přidat štítek" },
];

const EXTRA: { kind: QuickAddLayerType; label: string }[] = [
  { kind: "shape", label: "Přidat tvar" },
  { kind: "underline", label: "Podtržení" },
  { kind: "particle", label: "Částice" },
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
        + Přidat vrstvu
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Zavřít menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
            {PRIMARY.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  onAdd(kind);
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
              >
                {label}
              </button>
            ))}
            <div className="my-1 border-t border-zinc-800" />
            {EXTRA.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  onAdd(kind);
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-800"
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
