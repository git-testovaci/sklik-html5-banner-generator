import type { AnimationInsights } from "@/types/imported-banner";

interface AnimationInsightsProps {
  insights: AnimationInsights;
}

const COMPLEXITY_CS: Record<AnimationInsights["complexity"], string> = {
  low: "Nízká",
  medium: "Střední",
  high: "Vysoká",
};

const RECREATE_CS: Record<AnimationInsights["recreateCapability"], string> = {
  yes: "Ano",
  partial: "Částečně",
  no: "Ne",
};

export function AnimationInsightsPanel({ insights }: AnimationInsightsProps) {
  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Animace v importu</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Jen inspirace — nejde o přesnou kopii motion z ZIP.
        </p>
      </div>
      <div className="space-y-4 p-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Detekované animace</p>
          <p className="mt-1 text-zinc-300">
            {insights.keyframeNames.length
              ? insights.keyframeNames.join(", ")
              : "CSS keyframes nenalezeny"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Možná inspirace</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-zinc-400">
            {insights.inspirationNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-zinc-950/50 px-3 py-2">
            <p className="text-xs text-zinc-500">Složitost</p>
            <p className="font-medium text-zinc-200">{COMPLEXITY_CS[insights.complexity]}</p>
          </div>
          <div className="rounded-lg bg-zinc-950/50 px-3 py-2">
            <p className="text-xs text-zinc-500">Obnovit v editoru</p>
            <p className="font-medium text-zinc-200">{RECREATE_CS[insights.recreateCapability]}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
