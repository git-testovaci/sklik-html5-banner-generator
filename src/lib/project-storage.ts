import { generateShareId } from "@/lib/share-links";
import { createIonicCareDemoProject } from "@/lib/project-factory";
import { MOCK_PROJECTS } from "@/lib/mock-projects";
import {
  defaultStudioPlacements,
  defaultTimeline,
  layerAnimationsFromLegacy,
} from "@/lib/animation/timeline-utils";
import type { BannerAsset, BannerAssetPlacement, TextLayerPlacement } from "@/types/assets";
import type { BannerTimeline, LayerAnimation } from "@/types/animation";
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
  const demo = createIonicCareDemoProject();
  const rest = MOCK_PROJECTS.filter((project) => project.id !== "proj-001").map(
    (project) => ({ ...project }),
  );
  return [demo, ...rest];
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

  const width = record.width as number;
  const height = record.height as number;
  const animation = isValidAnimation(record.animation)
    ? record.animation
    : "fade-in";

  const studioDefaults = defaultStudioPlacements(width, height);

  const assets = Array.isArray(record.assets)
    ? (record.assets as BannerAsset[]).filter(
        (a) => a && typeof a.id === "string" && typeof a.fileName === "string",
      )
    : [];

  const assetPlacements = Array.isArray(record.assetPlacements)
    ? (record.assetPlacements as BannerAssetPlacement[])
    : studioDefaults.assetPlacements;

  const textPlacements = Array.isArray(record.textPlacements)
    ? (record.textPlacements as TextLayerPlacement[])
    : studioDefaults.textPlacements;

  const timeline: BannerTimeline =
    record.timeline && typeof record.timeline === "object"
      ? {
          durationMs:
            typeof (record.timeline as BannerTimeline).durationMs === "number"
              ? (record.timeline as BannerTimeline).durationMs
              : defaultTimeline().durationMs,
          loop: Boolean((record.timeline as BannerTimeline).loop),
          backgroundAnimation:
            (record.timeline as BannerTimeline).backgroundAnimation ?? "none",
        }
      : defaultTimeline();

  const layerAnimations: LayerAnimation[] = Array.isArray(
    record.layerAnimations,
  )
    ? (record.layerAnimations as LayerAnimation[])
    : layerAnimationsFromLegacy(animation);

  return {
    id: record.id,
    name: record.name,
    status: isValidStatus(record.status) ? record.status : "draft",
    width,
    height,
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
    animation,
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
    assets,
    assetPlacements,
    textPlacements,
    timeline,
    layerAnimations,
    scenes: Array.isArray(record.scenes) ? (record.scenes as BannerProject["scenes"]) : undefined,
    bannerLayers: Array.isArray(record.bannerLayers)
      ? (record.bannerLayers as BannerProject["bannerLayers"])
      : undefined,
    layerEffects: Array.isArray(record.layerEffects)
      ? (record.layerEffects as BannerProject["layerEffects"])
      : undefined,
    layerKeyframes: Array.isArray(record.layerKeyframes)
      ? (record.layerKeyframes as BannerProject["layerKeyframes"])
      : undefined,
    activeSceneId:
      typeof record.activeSceneId === "string" ? record.activeSceneId : undefined,
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

  const current = loadProjectsFromStorage();
  const assetIds = current.flatMap((p) => (p.assets ?? []).map((a) => a.id));

  resetProjectsStorage();

  if (assetIds.length > 0) {
    void import("@/lib/assets/asset-storage").then(({ deleteAssetsByProject }) =>
      deleteAssetsByProject("", assetIds),
    );
  }

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
  const removed = projects.find((item) => item.id === projectId);
  const next = projects.filter((item) => item.id !== projectId);
  saveProjectsToStorage(next);

  if (removed?.assets?.length && typeof window !== "undefined") {
    void import("@/lib/assets/asset-storage").then(({ deleteAssetsByProject }) =>
      deleteAssetsByProject(
        projectId,
        removed.assets?.map((a) => a.id) ?? [],
      ),
    );
  }

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
