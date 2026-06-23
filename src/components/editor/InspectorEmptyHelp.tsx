"use client";

export function InspectorEmptyHelp() {
  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-300">Vlastnosti</h2>
      </div>
      <div className="px-4 py-6">
        <p className="text-xs font-medium text-zinc-400">Vyberte vrstvu</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Vyberte vrstvu na plátně nebo v časové ose. Potom zde upravíte text, obrázek,
          animace a pozici.
        </p>
        <ul className="mt-4 space-y-1.5 text-[11px] text-zinc-600">
          <li>· Klikněte na vrstvu v náhledu banneru</li>
          <li>· Nebo vyberte řádek v časové ose dole</li>
          <li>· Nebo otevřete záložku Vrstvy vlevo</li>
        </ul>
      </div>
    </section>
  );
}
