"use client";

export function InspectorEmptyHelp() {
  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="px-4 py-6">
        <p className="text-sm font-medium text-zinc-400">Vyberte vrstvu nebo přechod</p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Vyberte vrstvu na plátně nebo v časové ose, nebo klikněte na blok přechodu mezi
          scénami. Potom zde upravíte vlastnosti.
        </p>
        <ul className="mt-4 space-y-1.5 text-xs text-zinc-600">
          <li>· Klikněte na vrstvu v náhledu banneru</li>
          <li>· Nebo vyberte řádek v časové ose dole</li>
          <li>· Nebo klikněte na přechod mezi scénami (žlutý blok)</li>
        </ul>
      </div>
    </section>
  );
}
