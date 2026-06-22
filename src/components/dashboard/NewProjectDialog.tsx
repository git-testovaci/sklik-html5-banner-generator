"use client";

import { useEffect, useRef, useState } from "react";
import { BANNER_SIZES } from "@/lib/banner-sizes";
import {
  createBannerProject,
  defaultNewProjectName,
} from "@/lib/project-factory";
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
  const [headline, setHeadline] = useState("Your headline here");
  const [subheadline, setSubheadline] = useState("Supporting message");
  const [cta, setCta] = useState("Learn more");

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
    setHeadline("Your headline here");
    setSubheadline("Supporting message");
    setCta("Learn more");
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
          <h2 className="text-lg font-semibold text-zinc-100">New banner</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Create a draft project and open it in the editor. Saved locally in
            this browser.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="new-project-name"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Project name <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="new-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              placeholder="Summer Sale 2026"
              aria-invalid={nameError}
              aria-describedby={nameError ? "new-project-name-error" : undefined}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            {nameError ? (
              <p id="new-project-name-error" className="mt-1 text-xs text-red-400" role="alert">
                Project name is required.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="new-project-size"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Banner size
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
              Choose the Sklik ad slot size. You can change it later in the editor.
            </p>
          </div>

          <div>
            <label
              htmlFor="new-project-headline"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Headline <span className="text-red-400">*</span>
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
              Main message — keep it short for small banner sizes.
            </p>
          </div>

          <div>
            <label
              htmlFor="new-project-subheadline"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Subheadline
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
              CTA text <span className="text-red-400">*</span>
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
              Button label only — click URL is set in Sklik, not in the banner.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create & open editor
          </button>
        </div>
      </form>
    </dialog>
  );
}
