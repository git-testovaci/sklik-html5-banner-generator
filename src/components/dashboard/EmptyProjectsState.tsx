export function EmptyProjectsState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800/80">
        <svg
          className="h-7 w-7 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-zinc-200">No banners yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
        Create your first HTML5 banner project and start building for Sklik.
      </p>
      {/* Phase 3+: open new project modal with size picker */}
      <button
        type="button"
        aria-label="Create first banner (coming soon)"
        className="mt-6 inline-flex items-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      >
        Create first banner
      </button>
    </div>
  );
}
