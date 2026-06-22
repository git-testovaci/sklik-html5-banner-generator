"use client";

import Link from "next/link";

interface DashboardHeaderProps {
  onNewBanner: () => void;
}

export function DashboardHeader({ onNewBanner }: DashboardHeaderProps) {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
            Sklik HTML5 Banner Generator
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Internal studio for HTML5 banner creation, validation, preview, import, and ZIP export.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link
            href="/import"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          >
            Import HTML5 ZIP
          </Link>
          <button
          type="button"
          onClick={onNewBanner}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-950/30 transition-colors hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New banner
        </button>
        </div>
      </div>
    </header>
  );
}
