import { MOCK_PROJECTS } from "@/lib/mock-projects";
import type { BannerProject } from "@/types/project";

export const STORAGE_KEY = "sklik-html5-banner-generator.projects.v1";

type StorageListener = () => void;
const storageListeners = new Set<StorageListener>();

export function subscribeProjects(listener: StorageListener): () => void {
  storageListeners.add(listener);
  return () => storageListeners.delete(listener);
}

export function notifyProjectsChanged(): void {
  storageListeners.forEach((listener) => listener());
}

function isClient(): boolean {
  return typeof window !== "undefined";
}

function isValidProject(value: unknown): value is BannerProject {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.status === "string" &&
    typeof p.width === "number" &&
    typeof p.height === "number" &&
    typeof p.headline === "string" &&
    typeof p.subheadline === "string" &&
    typeof p.cta === "string" &&
    typeof p.backgroundColor === "string" &&
    typeof p.textColor === "string" &&
    typeof p.ctaBackgroundColor === "string" &&
    typeof p.ctaTextColor === "string" &&
    typeof p.accentColor === "string" &&
    typeof p.animation === "string" &&
    typeof p.logoLabel === "string" &&
    typeof p.productImageLabel === "string" &&
    typeof p.shareId === "string" &&
    typeof p.createdAt === "string" &&
    typeof p.updatedAt === "string"
  );
}

function isValidProjectsArray(value: unknown): value is BannerProject[] {
  return Array.isArray(value) && value.every(isValidProject);
}

function seedFromMock(): BannerProject[] {
  return MOCK_PROJECTS.map((project) => ({ ...project }));
}

export function loadProjectsFromStorage(): BannerProject[] {
  if (!isClient()) {
    return seedFromMock();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedFromMock();
      saveProjectsToStorage(seeded);
      return seeded;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isValidProjectsArray(parsed)) {
      const seeded = seedFromMock();
      saveProjectsToStorage(seeded);
      return seeded;
    }

    return parsed;
  } catch {
    const seeded = seedFromMock();
    try {
      saveProjectsToStorage(seeded);
    } catch {
      // ignore write failures
    }
    return seeded;
  }
}

export function saveProjectsToStorage(projects: BannerProject[]): void {
  if (!isClient()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    notifyProjectsChanged();
  } catch {
    // ignore quota or privacy errors
  }
}

export function resetProjectsStorage(): void {
  if (!isClient()) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function upsertProject(project: BannerProject): BannerProject[] {
  const projects = loadProjectsFromStorage();
  const index = projects.findIndex((p) => p.id === project.id);
  const next =
    index >= 0
      ? projects.map((p) => (p.id === project.id ? project : p))
      : [...projects, project];

  saveProjectsToStorage(next);
  return next;
}

export function deleteProjectById(projectId: string): BannerProject[] {
  const projects = loadProjectsFromStorage();
  const next = projects.filter((p) => p.id !== projectId);
  saveProjectsToStorage(next);
  return next;
}

export function getStoredProjectById(
  projectId: string,
): BannerProject | undefined {
  return loadProjectsFromStorage().find((p) => p.id === projectId);
}

export function getStoredProjectByShareId(
  shareId: string,
): BannerProject | undefined {
  return loadProjectsFromStorage().find((p) => p.shareId === shareId);
}
