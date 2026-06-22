import type { BannerEditorState } from "@/types/editor";
import type { BannerProject, DashboardStats } from "@/types/project";

export const DEFAULT_PROJECT_COLORS = {
  backgroundColor: "#0f172a",
  textColor: "#f8fafc",
  ctaBackgroundColor: "#7c3aed",
  ctaTextColor: "#ffffff",
  accentColor: "#a78bfa",
} as const;

export const MOCK_PROJECTS: BannerProject[] = [
  {
    id: "proj-001",
    name: "Summer Sale 2026",
    status: "draft",
    width: 300,
    height: 250,
    headline: "Letní výprodej až −50 %",
    subheadline: "Jen do neděle na vybrané produkty",
    cta: "Nakupovat",
    shareId: "share-summer-sale-2026",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-20T14:32:00.000Z",
    ...DEFAULT_PROJECT_COLORS,
    animation: "fade-in",
    logoLabel: "Brand Logo",
    productImageLabel: "Summer product",
  },
  {
    id: "proj-002",
    name: "Brand Awareness Q2",
    status: "shared",
    width: 728,
    height: 90,
    headline: "Objevte novou kolekci",
    subheadline: "Elegance pro každý den",
    cta: "Zjistit více",
    shareId: "share-brand-q2",
    createdAt: "2026-06-05T08:00:00.000Z",
    updatedAt: "2026-06-18T09:15:00.000Z",
    backgroundColor: "#1e1b4b",
    textColor: "#e0e7ff",
    ctaBackgroundColor: "#6366f1",
    ctaTextColor: "#ffffff",
    accentColor: "#818cf8",
    animation: "slide-up",
    logoLabel: "Brand mark",
    productImageLabel: "",
  },
  {
    id: "proj-003",
    name: "Product Launch — Skyline",
    status: "exported",
    width: 300,
    height: 600,
    headline: "Nový Skyline Pro",
    subheadline: "Výkon, který mění pravidla",
    cta: "Předobjednat",
    shareId: "share-skyline-pro",
    createdAt: "2026-06-08T12:00:00.000Z",
    updatedAt: "2026-06-15T16:48:00.000Z",
    backgroundColor: "#18181b",
    textColor: "#fafafa",
    ctaBackgroundColor: "#059669",
    ctaTextColor: "#ffffff",
    accentColor: "#34d399",
    animation: "soft-pulse",
    logoLabel: "Skyline",
    productImageLabel: "Skyline Pro device",
  },
  {
    id: "proj-004",
    name: "Retargeting — Cart Abandoners",
    status: "draft",
    width: 320,
    height: 100,
    headline: "Nezapomeňte dokončit objednávku",
    subheadline: "V košíku vás čeká sleva 10 %",
    cta: "Dokončit nákup",
    shareId: "share-cart-abandoners",
    createdAt: "2026-06-12T09:00:00.000Z",
    updatedAt: "2026-06-19T11:02:00.000Z",
    backgroundColor: "#450a0a",
    textColor: "#fef2f2",
    ctaBackgroundColor: "#dc2626",
    ctaTextColor: "#ffffff",
    accentColor: "#f87171",
    animation: "none",
    logoLabel: "Shop",
    productImageLabel: "Cart item",
  },
  {
    id: "proj-005",
    name: "Holiday Campaign",
    status: "exported",
    width: 970,
    height: 310,
    headline: "Vánoční nabídka",
    subheadline: "Dárky pro celou rodinu",
    cta: "Prohlédnout",
    shareId: "share-holiday-2026",
    createdAt: "2026-06-01T14:00:00.000Z",
    updatedAt: "2026-06-10T08:20:00.000Z",
    backgroundColor: "#14532d",
    textColor: "#f0fdf4",
    ctaBackgroundColor: "#b91c1c",
    ctaTextColor: "#ffffff",
    accentColor: "#fca5a5",
    animation: "fade-in",
    logoLabel: "Holiday Shop",
    productImageLabel: "Gift box",
  },
  {
    id: "proj-006",
    name: "App Install — Mobile",
    status: "shared",
    width: 480,
    height: 480,
    headline: "Stáhněte si naši aplikaci",
    subheadline: "Exkluzivní slevy v mobilu",
    cta: "Stáhnout",
    shareId: "share-app-install",
    createdAt: "2026-06-14T11:00:00.000Z",
    updatedAt: "2026-06-17T13:55:00.000Z",
    backgroundColor: "#172554",
    textColor: "#eff6ff",
    ctaBackgroundColor: "#2563eb",
    ctaTextColor: "#ffffff",
    accentColor: "#60a5fa",
    animation: "slide-up",
    logoLabel: "App icon",
    productImageLabel: "Phone mockup",
  },
];

export function computeDashboardStats(
  projects: BannerProject[],
): DashboardStats {
  return {
    total: projects.length,
    drafts: projects.filter((p) => p.status === "draft").length,
    shared: projects.filter((p) => p.status === "shared").length,
    exported: projects.filter((p) => p.status === "exported").length,
  };
}

export function getProjectById(id: string): BannerProject | undefined {
  return MOCK_PROJECTS.find((p) => p.id === id);
}

export function getProjectByShareId(
  shareId: string,
): BannerProject | undefined {
  return MOCK_PROJECTS.find((p) => p.shareId === shareId);
}

export function projectToEditorState(
  project: BannerProject,
): BannerEditorState {
  return {
    projectId: project.id,
    name: project.name,
    status: project.status,
    width: project.width,
    height: project.height,
    headline: project.headline,
    subheadline: project.subheadline,
    cta: project.cta,
    backgroundColor: project.backgroundColor,
    textColor: project.textColor,
    ctaBackgroundColor: project.ctaBackgroundColor,
    ctaTextColor: project.ctaTextColor,
    accentColor: project.accentColor,
    animation: project.animation,
    logoLabel: project.logoLabel,
    productImageLabel: project.productImageLabel,
    shareId: project.shareId,
  };
}

export function editorStateToProject(
  state: BannerEditorState,
  existing?: BannerProject,
): BannerProject {
  const now = new Date().toISOString();

  return {
    id: state.projectId,
    name: state.name,
    status: state.status,
    width: state.width,
    height: state.height,
    headline: state.headline,
    subheadline: state.subheadline,
    cta: state.cta,
    backgroundColor: state.backgroundColor,
    textColor: state.textColor,
    ctaBackgroundColor: state.ctaBackgroundColor,
    ctaTextColor: state.ctaTextColor,
    accentColor: state.accentColor,
    animation: state.animation,
    logoLabel: state.logoLabel,
    productImageLabel: state.productImageLabel,
    shareId: state.shareId || existing?.shareId || "share-unknown",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
