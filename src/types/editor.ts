import type { ProjectStatus } from "./project";

export type BannerAnimation = "none" | "fade-in" | "slide-up" | "soft-pulse";

export interface BannerEditorState {
  projectId: string;
  name: string;
  status: ProjectStatus;
  width: number;
  height: number;
  headline: string;
  subheadline: string;
  cta: string;
  backgroundColor: string;
  textColor: string;
  ctaBackgroundColor: string;
  ctaTextColor: string;
  accentColor: string;
  animation: BannerAnimation;
  logoLabel: string;
  productImageLabel: string;
  shareId?: string;
}

export type ValidationRowStatus = "pass" | "warn" | "fail";

export interface ValidationRow {
  id: string;
  label: string;
  value: string;
  status: ValidationRowStatus;
}

export interface ValidationSummary {
  rows: ValidationRow[];
  exportReady: boolean;
  overallStatus: "pass" | "warn" | "fail";
}

export const BANNER_ANIMATIONS: readonly {
  value: BannerAnimation;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "fade-in", label: "Fade in" },
  { value: "slide-up", label: "Slide up" },
  { value: "soft-pulse", label: "Soft pulse" },
] as const;

export type BannerEditorStateUpdater = (
  patch: Partial<BannerEditorState>,
) => void;
