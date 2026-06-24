"use client";

export function InspectorEmptyHelp() {
  return (
    <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <div className="px-4 py-6">
        <p className="text-xs font-medium text-zinc-400">Vyberte vrstvu</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Vyberte vrstvu na plátně nebo v časové ose. Potom zde upravíte text, obrázek,
          animace a pozici.
        </p>
        <ul className="mt-4 space-y-1.5 text-[11px] text-zinc-600">
          <li>· Klikněte na vrstvu v náhledu banneru</li>
          <li>· Nebo vyberte řádek v časové ose dole</li>
        </ul>
      </div>
    </section>
  );
}
