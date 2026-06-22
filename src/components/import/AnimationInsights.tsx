import type { AnimationInsights } from "@/types/imported-banner";

interface AnimationInsightsProps {
  insights: AnimationInsights;
}

export function AnimationInsightsPanel({ insights }: AnimationInsightsProps) {
  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Animation insights</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Inspiration only — not an exact recreation of imported motion.
        </p>
      </div>
      <div className="space-y-4 p-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Detected animations</p>
          <p className="mt-1 text-zinc-300">
            {insights.keyframeNames.length
              ? insights.keyframeNames.join(", ")
              : "No CSS keyframes detected"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Possible inspiration</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-zinc-400">
            {insights.inspirationNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-zinc-950/50 px-3 py-2">
            <p className="text-xs text-zinc-500">Complexity</p>
            <p className="font-medium capitalize text-zinc-200">{insights.complexity}</p>
          </div>
          <div className="rounded-lg bg-zinc-950/50 px-3 py-2">
            <p className="text-xs text-zinc-500">Recreate in editor</p>
            <p className="font-medium capitalize text-zinc-200">{insights.recreateCapability}</p>
          </div>
        </div>
        {insights.timelineHints.length > 0 ? (
          <p className="text-xs text-zinc-500">
            {insights.timelineHints.join(" · ")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
