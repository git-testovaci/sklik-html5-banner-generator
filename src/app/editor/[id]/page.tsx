import type { Metadata } from "next";
import { BannerEditor } from "@/components/editor/BannerEditor";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EditorPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Editor — ${id}`,
    description: "Edit and preview HTML5 banner creative",
  };
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { id } = await params;
  return <BannerEditor projectId={id} />;
}
