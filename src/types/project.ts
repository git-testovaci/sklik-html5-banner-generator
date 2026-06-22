import type { BannerAnimation } from "./editor";

export type ProjectStatus = "draft" | "shared" | "exported";

export interface BannerProject {
  id: string;
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
  shareId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  total: number;
  drafts: number;
  shared: number;
  exported: number;
}
