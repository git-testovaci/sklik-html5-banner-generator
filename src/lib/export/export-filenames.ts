import type { BannerEditorState } from "@/types/editor";

export function createExportFileName(state: BannerEditorState): string {
  const safeName = state.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40);

  const namePart = safeName || "banner";
  return `sklik-${namePart}-${state.width}x${state.height}.zip`;
}
