import type { ImportedZipFileEntry } from "@/types/imported-banner";

interface ImportedFilesListProps {
  files: ImportedZipFileEntry[];
}

const GROUP_ORDER: ImportedZipFileEntry["kind"][] = [
  "html",
  "css",
  "js",
  "image",
  "font",
  "video",
  "zip",
  "other",
];

export function ImportedFilesList({ files }: ImportedFilesListProps) {
  const groups = GROUP_ORDER.map((kind) => ({
    kind,
    items: files.filter((f) => f.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Obsah ZIP</h2>
        <p className="text-xs text-zinc-500">{files.length} souborů</p>
      </div>
      <div className="max-h-72 overflow-y-auto p-4">
        {groups.map(({ kind, items }) => (
          <div key={kind} className="mb-4 last:mb-0">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {kind}
            </p>
            <ul className="space-y-1">
              {items.map((file) => (
                <li
                  key={file.path}
                  className="flex items-center justify-between gap-2 rounded-lg bg-zinc-950/40 px-3 py-2 text-sm"
                >
                  <span className="truncate font-mono text-zinc-300">{file.path}</span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {Math.max(1, Math.round(file.size / 1024))} kB
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
