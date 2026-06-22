import { generateShareId } from "@/lib/share-links";
import { MOCK_PROJECTS } from "@/lib/mock-projects";
import type { BannerProject } from "@/types/project";

export const STORAGE_KEY = "sklik-html5-banner-generator.projects.v1";

const SERVER_SNAPSHOT: BannerProject[] = [];

type StorageListener = () => void;
const storageListeners = new Set<StorageListener>();

let cachedProjects: BannerProject[] | null = null;
let cachedRawJson: string | null | undefined = undefined;

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

function invalidateCache(): void {
  cachedProjects = null;
  cachedRawJson = undefined;
}

function seedFromMock(): BannerProject[] {
  return MOCK_PROJECTS.map((project) => ({ ...project }));
}

function isValidStatus(value: unknown): value is BannerProject["status"] {
  return value === "draft" || value === "shared" || value === "exported";
}

function isValidAnimation(value: unknown): value is BannerProject["animation"] {
  return (
    value === "none" ||
    value === "fade-in" ||
    value === "slide-up" ||
    value === "soft-pulse"
  );
}

function migrateProject(value: unknown): BannerProject | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const now = new Date().toISOString();

  if (typeof record.id !== "string" || typeof record.name !== "string") {
    return null;
  }

  if (
    typeof record.width !== "number" ||
    typeof record.height !== "number" ||
    typeof record.headline !== "string" ||
    typeof record.subheadline !== "string" ||
    typeof record.cta !== "string"
  ) {
    return null;
  }

  const updatedAt =
    typeof record.updatedAt === "string" ? record.updatedAt : now;
  const createdAt =
    typeof record.createdAt === "string" ? record.createdAt : updatedAt;

  return {
    id: record.id,
    name: record.name,
    status: isValidStatus(record.status) ? record.status : "draft",
    width: record.width,
    height: record.height,
    headline: record.headline,
    subheadline: record.subheadline,
    cta: record.cta,
    backgroundColor:
      typeof record.backgroundColor === "string"
        ? record.backgroundColor
        : "#0f172a",
    textColor:
      typeof record.textColor === "string" ? record.textColor : "#f8fafc",
    ctaBackgroundColor:
      typeof record.ctaBackgroundColor === "string"
        ? record.ctaBackgroundColor
        : "#7c3aed",
    ctaTextColor:
      typeof record.ctaTextColor === "string"
        ? record.ctaTextColor
        : "#ffffff",
    accentColor:
      typeof record.accentColor === "string"
        ? record.accentColor
        : "#a78bfa",
    animation: isValidAnimation(record.animation)
      ? record.animation
      : "fade-in",
    logoLabel:
      typeof record.logoLabel === "string" ? record.logoLabel : "Logo",
    productImageLabel:
      typeof record.productImageLabel === "string"
        ? record.productImageLabel
        : "Product",
    shareId:
      typeof record.shareId === "string" && record.shareId.length > 0
        ? record.shareId
        : generateShareId(),
    createdAt,
    updatedAt,
  };
}

function parseStoredProjects(raw: string | null): BannerProject[] {
  if (!raw) {
    return seedFromMock();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return seedFromMock();
    }

    const migrated = parsed
      .map(migrateProject)
      .filter((project): project is BannerProject => project !== null);

    if (migrated.length === 0) {
      return seedFromMock();
    }

    return migrated;
  } catch {
    return seedFromMock();
  }
}

function persistProjects(projects: BannerProject[], notify: boolean): void {
  if (!isClient()) return;

  try {
    const json = JSON.stringify(projects);
    localStorage.setItem(STORAGE_KEY, json);
    cachedProjects = projects;
    cachedRawJson = json;

    if (notify) {
      notifyProjectsChanged();
    }
  } catch {
    cachedProjects = projects;
    cachedRawJson = JSON.stringify(projects);
  }
}

export function loadProjectsFromStorage(): BannerProject[] {
  if (!isClient()) {
    return SERVER_SNAPSHOT;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw === cachedRawJson && cachedProjects !== null) {
      return cachedProjects;
    }

    const projects = parseStoredProjects(raw);
    const json = JSON.stringify(projects);
    const needsRewrite = raw !== json;

    cachedProjects = projects;
    cachedRawJson = json;

    if (needsRewrite) {
      persistProjects(projects, false);
    }

    return cachedProjects;
  } catch {
    const seeded = seedFromMock();
    persistProjects(seeded, false);
    return cachedProjects ?? seeded;
  }
}

export function saveProjectsToStorage(projects: BannerProject[]): void {
  persistProjects(projects, true);
}

export function resetProjectsStorage(): void {
  if (!isClient()) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }

  invalidateCache();
}

export function resetProjectsToSeed(): BannerProject[] {
  if (!isClient()) {
    return SERVER_SNAPSHOT;
  }

  resetProjectsStorage();
  const seeded = seedFromMock();
  persistProjects(seeded, true);
  return seeded;
}

export function upsertProject(project: BannerProject): BannerProject[] {
  const projects = loadProjectsFromStorage();
  const index = projects.findIndex((item) => item.id === project.id);
  const next =
    index >= 0
      ? projects.map((item) => (item.id === project.id ? project : item))
      : [...projects, project];

  saveProjectsToStorage(next);
  return next;
}

export function deleteProjectById(projectId: string): BannerProject[] {
  const projects = loadProjectsFromStorage();
  const next = projects.filter((item) => item.id !== projectId);
  saveProjectsToStorage(next);
  return next;
}

export function getStoredProjectById(
  projectId: string,
): BannerProject | undefined {
  return loadProjectsFromStorage().find((project) => project.id === projectId);
}

export function getStoredProjectByShareId(
  shareId: string,
): BannerProject | undefined {
  return loadProjectsFromStorage().find(
    (project) => project.shareId === shareId,
  );
}

export function getProjectsServerSnapshot(): BannerProject[] {
  return SERVER_SNAPSHOT;
}

export function getProjectByIdSnapshot(
  projectId: string,
): BannerProject | undefined {
  return (
    loadProjectsFromStorage().find((project) => project.id === projectId) ??
    MOCK_PROJECTS.find((project) => project.id === projectId)
  );
}

export function getProjectByShareIdSnapshot(
  shareId: string,
): BannerProject | undefined {
  return (
    loadProjectsFromStorage().find((project) => project.shareId === shareId) ??
    MOCK_PROJECTS.find((project) => project.shareId === shareId)
  );
}
