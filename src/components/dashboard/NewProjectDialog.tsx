"use client";

import { useEffect, useRef, useState } from "react";
import { BANNER_SIZES } from "@/lib/banner-sizes";
import { createBannerProject, DEFAULT_BANNER_COPY, defaultNewProjectName } from "@/lib/project-factory";
import { upsertProject } from "@/lib/project-storage";

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

const DEFAULT_SIZE = BANNER_SIZES[0];

export function NewProjectDialog({
  open,
  onClose,
  onCreated,
}: NewProjectDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [sizeValue, setSizeValue] = useState(
    `${DEFAULT_SIZE.width}x${DEFAULT_SIZE.height}`,
  );
  const [headline, setHeadline] = useState<string>(DEFAULT_BANNER_COPY.headline);
  const [subheadline, setSubheadline] = useState<string>(DEFAULT_BANNER_COPY.subheadline);
  const [cta, setCta] = useState<string>(DEFAULT_BANNER_COPY.cta);

  const trimmedName = name.trim();
  const nameError = nameTouched && trimmedName.length === 0;
  const canSubmit = trimmedName.length > 0 && headline.trim().length > 0 && cta.trim().length > 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      setName(defaultNewProjectName());
      setNameTouched(false);
      requestAnimationFrame(() => nameInputRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function resetForm() {
    setName("");
    setNameTouched(false);
    setSizeValue(`${DEFAULT_SIZE.width}x${DEFAULT_SIZE.height}`);
    setHeadline(DEFAULT_BANNER_COPY.headline);
    setSubheadline(DEFAULT_BANNER_COPY.subheadline);
    setCta(DEFAULT_BANNER_COPY.cta);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNameTouched(true);
    if (!canSubmit) return;

    const [width, height] = sizeValue.split("x").map(Number);
    const project = createBannerProject({
      name: trimmedName,
      width,
      height,
      headline: headline.trim(),
      subheadline: subheadline.trim(),
      cta: cta.trim(),
    });

    upsertProject(project);
    handleClose();
    onCreated(project.id);
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onCancel={handleClose}
      className="w-[calc(100%-2rem)] max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/60"
    >
      <form onSubmit={handleSubmit} className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-100">Nový banner</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Vytvořte koncept a otevřete editor. Po vytvoření vyberte profesionální šablonu
            nebo přidejte vrstvy na plátně. Projekt se uloží lokálně v tomto prohlížeči.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="new-project-name"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Název projektu <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="new-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="Letní akce 2026"
              aria-invalid={nameError}
              aria-describedby={nameError ? "new-project-name-error" : undefined}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            {nameError ? (
              <p id="new-project-name-error" className="mt-1 text-xs text-red-400" role="alert">
                Název projektu je povinný.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="new-project-size"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Velikost banneru
            </label>
            <select
              id="new-project-size"
              value={sizeValue}
              onChange={(e) => setSizeValue(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {BANNER_SIZES.map((size) => (
                <option key={size.label} value={`${size.width}x${size.height}`}>
                  {size.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              Velikost reklamního slotu ve Skliku. V editoru ji lze upravit.
            </p>
          </div>

          <div>
            <label
              htmlFor="new-project-headline"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Nadpis <span className="text-red-400">*</span>
            </label>
            <input
              id="new-project-headline"
              type="text"
              required
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Hlavní sdělení — u menších formátů držte text krátký.
            </p>
          </div>

          <div>
            <label
              htmlFor="new-project-subheadline"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Podnadpis
            </label>
            <input
              id="new-project-subheadline"
              type="text"
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div>
            <label
              htmlFor="new-project-cta"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Výzva k akci <span className="text-red-400">*</span>
            </label>
            <input
              id="new-project-cta"
              type="text"
              required
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Text tlačítka — klik URL se nastavuje ve Skliku, ne v banneru.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
          >
            Zrušit
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Vytvořit a otevřít editor
          </button>
        </div>
      </form>
    </dialog>
  );
}
