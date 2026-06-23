import type { BannerEditorState } from "@/types/editor";
import {
  hasAnimations,
  hasStoryboardTemplate,
  logoChecklistStatus,
  productChecklistStatus,
  textsLookEdited,
} from "@/lib/editor/checklist-utils";

export type WorkflowGuidanceAction = "templates" | "assets" | "play" | "text";

export interface WorkflowGuidance {
  id: string;
  message: string;
  actionLabel?: string;
  action?: WorkflowGuidanceAction;
}

export function deriveWorkflowGuidance(state: BannerEditorState): WorkflowGuidance | null {
  if (!hasStoryboardTemplate(state)) {
    return {
      id: "pick-template",
      message: "Vyberte šablonu nebo přidejte první vrstvu pomocí + Přidat na plátně.",
      actionLabel: "Otevřít šablony",
      action: "templates",
    };
  }

  const logo = logoChecklistStatus(state);
  const product = productChecklistStatus(state);

  if (logo === "warn" || product === "warn") {
    return {
      id: "upload-slots",
      message: "Nahrajte logo a produkt, poté spusťte přehrání.",
      actionLabel: "Otevřít assety",
      action: "assets",
    };
  }

  if (!textsLookEdited(state)) {
    return {
      id: "edit-text",
      message: "Upravte texty v banneru — klikněte na nadpis na plátně.",
      actionLabel: "Vybrat text",
      action: "text",
    };
  }

  if (hasAnimations(state) && (state.scenes ?? []).length > 1) {
    return {
      id: "ready-play",
      message: "Banner je připraven. Spusťte přehrání pro kontrolu animací a přechodů.",
      actionLabel: "Přehrát vše",
      action: "play",
    };
  }

  return null;
}

export function nextStepAfterAssetPlacement(
  kind: "logo" | "product" | "background" | "decoration" | "other",
): string | null {
  if (kind === "product") {
    return "Produkt vložen. Teď upravte texty nebo spusťte přehrání.";
  }
  if (kind === "logo") {
    return "Logo vloženo. Nahrajte produkt nebo upravte texty.";
  }
  return null;
}
