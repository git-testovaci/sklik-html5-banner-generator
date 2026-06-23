import type { ValidationRow } from "@/types/validation";

const STATUS_STYLES = {
  pass: "bg-emerald-950/60 text-emerald-300 ring-emerald-800/50",
  warn: "bg-amber-950/60 text-amber-300 ring-amber-800/50",
  fail: "bg-red-950/60 text-red-300 ring-red-800/50",
  info: "bg-zinc-800/80 text-zinc-400 ring-zinc-700/50",
  pending: "bg-zinc-800/60 text-zinc-500 ring-zinc-700/50",
} as const;

const STATUS_LABELS = {
  pass: "OK",
  warn: "VAR",
  fail: "CHYBA",
  info: "INFO",
  pending: "…",
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
  imageSummaries?: import("@/types/imported-banner").ImportImageSummary[];
}

export function ImportAnalysisPanel({
  rows,
  overallStatus,
  sklikReadiness,
  imageSummaries = [],
}: ImportAnalysisPanelProps) {
  const readinessLabel = {
    ready: "Pravděpodobně připraveno ke kontrole",
    review: "Zkontrolujte upozornění před dalším použitím",
    "not-ready": "Nejdříve opravte blokující problémy",
  }[sklikReadiness];

  const criticalRows = rows.filter(
    (row) =>
      row.status === "fail" ||
      (row.status === "warn" && HIGHLIGHT_ROW_IDS.has(row.id)),
  );

  return (
    <aside className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Analýza importu</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Celkově: <span className="uppercase text-zinc-300">{overallStatus === "pass" ? "OK" : overallStatus === "warn" ? "VAROVÁNÍ" : "CHYBA"}</span>
        </p>
      </div>

      {imageSummaries.length > 0 ? (
        <div className="border-b border-zinc-800/60 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Nalezené obrázky ({imageSummaries.length})
          </p>
          <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-zinc-400">
            {imageSummaries.map((img) => (
              <li key={img.path}>
                {img.name} · {img.suggestedRole} · {Math.round(img.size / 1024)} kB
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {criticalRows.length > 0 ? (
        <div className="border-b border-amber-900/30 bg-amber-950/15 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-400">
            Zkontrolujte tyto body
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
              {STATUS_LABELS[row.status]}
            </span>
          </li>
        ))}
      </ul>
      <div className="border-t border-zinc-800/60 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Odhad pro Sklik</p>
        <p className="mt-1 text-sm font-medium text-zinc-200">{readinessLabel}</p>
      </div>
    </aside>
  );
}
