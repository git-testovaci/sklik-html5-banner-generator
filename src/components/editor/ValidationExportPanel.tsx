"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { getPreviewUrl } from "@/lib/share-links";
import type { BannerEditorState } from "@/types/editor";
import type { ValidationSummary } from "@/types/validation";
import type { ValidationRowStatus } from "@/types/validation";

interface ValidationExportPanelProps {
  state: BannerEditorState;
  validation: ValidationSummary;
}

const STATUS_STYLES: Record<
  ValidationRowStatus,
  { badge: string; icon: string }
> = {
  pass: {
    badge: "bg-emerald-950/60 text-emerald-300 ring-emerald-800/50",
    icon: "✓",
  },
  warn: {
    badge: "bg-amber-950/60 text-amber-300 ring-amber-800/50",
    icon: "!",
  },
  fail: {
    badge: "bg-red-950/60 text-red-300 ring-red-800/50",
    icon: "✕",
  },
  info: {
    badge: "bg-zinc-800/80 text-zinc-400 ring-zinc-700/50",
    icon: "i",
  },
  pending: {
    badge: "bg-zinc-800/60 text-zinc-500 ring-zinc-700/50",
    icon: "…",
  },
};

const OVERALL_LABELS = {
  pass: { text: "Ready for export prep", className: "text-emerald-400" },
  warn: { text: "Review warnings before export", className: "text-amber-400" },
  fail: { text: "Fix issues before export", className: "text-red-400" },
} as const;

export function ValidationExportPanel({
  state,
  validation,
}: ValidationExportPanelProps) {
  const [copied, setCopied] = useState(false);
  const overall = OVERALL_LABELS[validation.overallStatus];

  const handleCopyLink = useCallback(async () => {
    const url = getPreviewUrl(state.shareId);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [state.shareId]);

  return (
    <aside
      aria-labelledby="validation-heading"
      className="flex w-full shrink-0 flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/40 lg:w-[320px]"
    >
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 id="validation-heading" className="text-sm font-medium text-zinc-300">
          Validation & export
        </h2>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        <ul className="space-y-2" aria-label="Validation checks">
          {validation.rows.map((row) => {
            const style = STATUS_STYLES[row.status];
            return (
              <li
                key={row.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-300">{row.label}</p>
                  <p className="text-xs text-zinc-500">{row.value}</p>
                </div>
                <span
                  className={`inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs font-medium ring-1 ring-inset ${style.badge}`}
                  aria-label={row.status.toUpperCase()}
                >
                  {style.icon} {row.status.toUpperCase()}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Export readiness
          </p>
          <p className={`mt-1 text-sm font-semibold ${overall.className}`}>
            {overall.text}
          </p>
        </div>
      </div>

      <div className="space-y-2 border-t border-zinc-800/60 p-4">
        <button
          type="button"
          disabled
          aria-label="ZIP export coming in Phase 8"
          className="w-full cursor-not-allowed rounded-lg bg-violet-600/40 px-4 py-2.5 text-sm font-medium text-white/60"
        >
          ZIP export coming in Phase 8
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          aria-label="Copy preview link"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
        >
          {copied ? "Link copied" : "Copy preview link"}
        </button>

        <Link
          href={`/preview/${state.shareId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
        >
          Open public preview
        </Link>
      </div>
    </aside>
  );
}
