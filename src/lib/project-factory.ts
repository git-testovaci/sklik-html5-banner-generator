import { generateShareId } from "@/lib/share-links";
import {
  defaultLayerAnimations,
  defaultStudioPlacements,
  defaultTimeline,
  editorStateToProject,
  layerAnimationsForImport,
  projectToEditorState,
} from "@/lib/animation/timeline-utils";
import { applyIonicCareSequence } from "@/lib/templates/apply-template";
import type { BannerAnimation } from "@/types/editor";
import type { BannerProject } from "@/types/project";

export const DEFAULT_BANNER_COPY = {
  headline: "Váš nadpis zde",
  subheadline: "Podnadpis nebo krátký popis",
  cta: "Zjistit více",
} as const;

export const DEFAULT_PROJECT_COLORS = {
  backgroundColor: "#0f172a",
  textColor: "#f8fafc",
  ctaBackgroundColor: "#7c3aed",
  ctaTextColor: "#ffffff",
  accentColor: "#a78bfa",
} as const;

export interface CreateBannerProjectInput {
  name: string;
  width: number;
  height: number;
  headline: string;
  subheadline: string;
  cta: string;
  animation?: BannerAnimation;
}

export interface CreateBannerProjectFromImportInput extends CreateBannerProjectInput {
  animation: BannerAnimation;
  animationComplexity?: "low" | "medium" | "high";
}

export function createBannerProject(
  input: CreateBannerProjectInput,
): BannerProject {
  const now = new Date().toISOString();
  const suffix = Math.random().toString(36).slice(2, 6);
  const { assetPlacements, textPlacements } = defaultStudioPlacements(
    input.width,
    input.height,
  );

  return {
    id: `proj-${Date.now()}-${suffix}`,
    name: input.name.trim() || "Untitled banner",
    status: "draft",
    width: input.width,
    height: input.height,
    headline: input.headline.trim() || DEFAULT_BANNER_COPY.headline,
    subheadline: input.subheadline.trim() || DEFAULT_BANNER_COPY.subheadline,
    cta: input.cta.trim() || DEFAULT_BANNER_COPY.cta,
    ...DEFAULT_PROJECT_COLORS,
    animation: input.animation ?? "fade-in",
    logoLabel: "Logo",
    productImageLabel: "Product",
    shareId: generateShareId(),
    createdAt: now,
    updatedAt: now,
    assets: [],
    assetPlacements,
    textPlacements,
    timeline: defaultTimeline(),
    layerAnimations: defaultLayerAnimations(),
  };
}

export function createBannerProjectFromImport(
  input: CreateBannerProjectFromImportInput,
): BannerProject {
  const project = createBannerProject(input);
  const complexity = input.animationComplexity ?? "medium";
  return {
    ...project,
    layerAnimations: layerAnimationsForImport(complexity),
  };
}

const IMPORT_PROJECT_ID_PATTERN = /^proj-\d{13,}-/;

export function isImportCreatedProjectId(projectId: string): boolean {
  return IMPORT_PROJECT_ID_PATTERN.test(projectId);
}

export function defaultNewProjectName(): string {
  const formatted = new Intl.DateTimeFormat("cs-CZ", {
    month: "short",
    year: "numeric",
  }).format(new Date());
  return `Banner ${formatted}`;
}

export function createIonicCareDemoProject(): BannerProject {
  const now = new Date().toISOString();
  const base = createBannerProject({
    name: "Ionic Care — ukázkový storyboard",
    width: 300,
    height: 250,
    headline: "Čistá péče pro vaši pleť",
    subheadline: "Dýchejte čistý vzduch",
    cta: "Zjistit více",
    animation: "fade-in",
  });

  const seed: BannerProject = {
    ...base,
    id: "proj-001",
    status: "shared",
    shareId: "share-summer-sale-2026",
    logoLabel: "Logo",
    productImageLabel: "Produkt",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: now,
  };

  const state = applyIonicCareSequence(projectToEditorState(seed));
  return editorStateToProject(
    {
      ...state,
      projectId: seed.id,
      name: seed.name,
      status: seed.status,
      shareId: seed.shareId,
    },
    seed,
  );
}

export { editorStateToProject, projectToEditorState } from "@/lib/animation/timeline-utils";
