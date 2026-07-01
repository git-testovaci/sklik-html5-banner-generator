"use client";

import { useEffect, useRef, useState } from "react";
import { createClassicBannerProject } from "@/lib/classic-banner/classic-banner-project";
import { defaultClassicProjectName } from "@/lib/classic-banner/classic-banner-defaults";
import { upsertProject } from "@/lib/project-storage";

interface NewClassicProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

export function NewClassicProjectDialog({
  open,
  onClose,
  onCreated,
}: NewClassicProjectDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);

  const trimmedName = name.trim();
  const nameError = nameTouched && trimmedName.length === 0;
  const canSubmit = trimmedName.length > 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      setName(defaultClassicProjectName());
      setNameTouched(false);
      requestAnimationFrame(() => nameInputRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function resetForm() {
    setName("");
    setNameTouched(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNameTouched(true);
    if (!canSubmit) return;

    const project = createClassicBannerProject({ name: trimmedName });
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
          <h2 className="text-lg font-semibold text-zinc-100">Nový klasický banner</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Vytvoří projekt s výchozím obsahem a variantami pro všechny klasické formáty.
            Editor variant a PNG export přijdou v další fázi.
          </p>
        </div>

        <div>
          <label
            htmlFor="new-classic-project-name"
            className="mb-1.5 block text-sm font-medium text-zinc-300"
          >
            Název projektu <span className="text-red-400">*</span>
          </label>
          <input
            ref={nameInputRef}
            id="new-classic-project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            placeholder="Klasický banner 2026"
            aria-invalid={nameError}
            aria-describedby={nameError ? "new-classic-project-name-error" : undefined}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          {nameError ? (
            <p id="new-classic-project-name-error" className="mt-1 text-xs text-red-400" role="alert">
              Název projektu je povinný.
            </p>
          ) : null}
          <p className="mt-2 text-xs text-zinc-500">
            Hlavní velikost: 300×600. Projekt se uloží lokálně v tomto prohlížeči.
          </p>
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
            Vytvořit klasický banner
          </button>
        </div>
      </form>
    </dialog>
  );
}
