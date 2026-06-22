import Link from "next/link";
import { formatBannerSize } from "@/lib/banner-sizes";
import type { BannerEditorState } from "@/types/editor";
import { ProjectStatusBadge } from "@/components/dashboard/ProjectStatusBadge";

interface EditorTopBarProps {
  state: BannerEditorState;
}

export function EditorTopBar({ state }: EditorTopBarProps) {
  const sizeLabel = formatBannerSize(state.width, state.height);

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-sm">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Dashboard
          </Link>
          <span className="hidden text-zinc-700 sm:inline" aria-hidden="true">|</span>
          <h1 className="truncate text-base font-semibold text-zinc-100 sm:text-lg">
            {state.name}
          </h1>
          <ProjectStatusBadge status={state.status} />
        </div>
        <p className="font-mono text-sm text-zinc-500">{sizeLabel}</p>
      </div>
    </header>
  );
}
