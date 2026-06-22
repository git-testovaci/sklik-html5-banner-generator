import type { Metadata } from "next";
import { BannerEditor } from "@/components/editor/BannerEditor";
import {
  createDefaultEditorState,
  getProjectById,
  projectToEditorState,
} from "@/lib/mock-projects";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EditorPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = getProjectById(id);

  return {
    title: project
      ? `${project.name} — Editor`
      : "Editor — Sklik HTML5 Banner Generator",
    description: "Edit and preview HTML5 banner creative",
  };
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { id } = await params;
  const project = getProjectById(id);
  const initialState = project
    ? projectToEditorState(project)
    : createDefaultEditorState(id);

  return <BannerEditor initialState={initialState} />;
}
