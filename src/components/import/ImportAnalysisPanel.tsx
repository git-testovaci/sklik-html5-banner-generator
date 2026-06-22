import type { ValidationRow } from "@/types/validation";

const STATUS_STYLES = {
  pass: "bg-emerald-950/60 text-emerald-300 ring-emerald-800/50",
  warn: "bg-amber-950/60 text-amber-300 ring-amber-800/50",
  fail: "bg-red-950/60 text-red-300 ring-red-800/50",
  info: "bg-zinc-800/80 text-zinc-400 ring-zinc-700/50",
  pending: "bg-zinc-800/60 text-zinc-500 ring-zinc-700/50",
} as const;

const HIGHLIGHT_ROW_IDS = new Set([
  "html-count",
  "nested-zip",
  "forbidden-js",
  "video",
  "external",
]);

interface ImportAnalysisPanelProps {
  rows: ValidationRow[];
  overallStatus: "pass" | "warn" | "fail";
  sklikReadiness: "ready" | "review" | "not-ready";
}

export function ImportAnalysisPanel({
  rows,
  overallStatus,
  sklikReadiness,
}: ImportAnalysisPanelProps) {
  const readinessLabel = {
    ready: "Likely ready for review",
    review: "Review warnings before reuse",
    "not-ready": "Fix blocking issues first",
  }[sklikReadiness];

  const criticalRows = rows.filter(
    (row) =>
      row.status === "fail" ||
      (row.status === "warn" && HIGHLIGHT_ROW_IDS.has(row.id)),
  );

  return (
    <aside className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Import analysis</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Overall: <span className="uppercase text-zinc-300">{overallStatus}</span>
        </p>
      </div>

      {criticalRows.length > 0 ? (
        <div className="border-b border-amber-900/30 bg-amber-950/15 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-400">
            Review these issues
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-200/90">
            {criticalRows.map((row) => (
              <li key={row.id}>
                <span className="font-medium">{row.label}:</span> {row.value}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="max-h-80 space-y-2 overflow-y-auto p-4">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-start justify-between gap-2 rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-300">{row.label}</p>
              <p className="text-xs text-zinc-500">{row.value}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[row.status]}`}
            >
              {row.status.toUpperCase()}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-zinc-800/60 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Sklik readiness estimate</p>
        <p className="mt-1 text-sm font-medium text-zinc-200">{readinessLabel}</p>
      </div>
    </aside>
  );
}
