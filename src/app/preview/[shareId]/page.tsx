import type { Metadata } from "next";
import { PublicPreviewShell } from "@/components/preview/PublicPreviewShell";
import {
  getFallbackPreviewProject,
  getProjectByShareId,
  projectToEditorState,
} from "@/lib/mock-projects";

interface PreviewPageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({
  params,
}: PreviewPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const project =
    getProjectByShareId(shareId) ?? getFallbackPreviewProject();

  return {
    title: `${project.name} — Preview`,
    description: "Read-only banner preview",
  };
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { shareId } = await params;
  const project =
    getProjectByShareId(shareId) ?? getFallbackPreviewProject();
  const state = projectToEditorState(project);

  return <PublicPreviewShell state={state} />;
}
