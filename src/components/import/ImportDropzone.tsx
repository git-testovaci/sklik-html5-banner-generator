"use client";

interface ImportDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  error?: string | null;
}

export function ImportDropzone({
  onFileSelected,
  disabled = false,
  error,
}: ImportDropzoneProps) {
  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    onFileSelected(file);
  }

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6">
      <label
        htmlFor="import-zip-input"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          disabled
            ? "cursor-not-allowed border-zinc-800 bg-zinc-950/40 opacity-60"
            : "border-zinc-700 bg-zinc-950/30 hover:border-violet-600/60 hover:bg-zinc-950/50"
        }`}
      >
        <svg className="mb-4 h-10 w-10 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm font-medium text-zinc-200">
          Drag & drop HTML5 ZIP here
        </p>
        <p className="mt-1 text-sm text-zinc-500">or click to choose a .zip file</p>
        <p className="mt-3 text-xs text-amber-400/90">
          Sklik single-banner limit: 250 kB
        </p>
      </label>
      <input
        id="import-zip-input"
        type="file"
        accept=".zip,application/zip"
        disabled={disabled}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        Preview runs in a sandboxed iframe. Files are processed locally in your browser.
      </p>
      {error ? (
        <p className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
