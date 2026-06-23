import type { BannerEditorState } from "@/types/editor";
import {
  hasAnimations,
  hasMediaInLibrary,
  hasMediaOnTimeline,
  hasStoryboardTemplate,
  textsLookEdited,
} from "@/lib/editor/checklist-utils";

export type WorkflowGuidanceAction = "templates" | "assets" | "play" | "text" | "timing" | "export";

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
      message: "Začněte výběrem šablony — potom nahrajete média a přidáte je na časovou osu.",
      actionLabel: "Otevřít šablony",
      action: "templates",
    };
  }

  if (!hasMediaInLibrary(state)) {
    return {
      id: "upload-media",
      message: "Nahrajte logo, produkt nebo obrázek do panelu Média.",
      actionLabel: "Otevřít Média",
      action: "assets",
    };
  }

  if (!hasMediaOnTimeline(state) && (state.assets ?? []).length > 0) {
    return {
      id: "add-to-timeline",
      message: "Přidejte nahraná média na časovou osu tlačítkem + Přidat na časovou osu.",
      actionLabel: "Otevřít Média",
      action: "assets",
    };
  }

  if (!textsLookEdited(state)) {
    return {
      id: "edit-text",
      message: "Upravte texty banneru — klikněte na nadpis na plátně nebo v panelu Vrstvy.",
      actionLabel: "Vybrat text",
      action: "text",
    };
  }

  if (!hasAnimations(state)) {
    return {
      id: "add-animations",
      message: "Nastavte animace vrstev v inspectoru nebo na časové ose.",
      actionLabel: "Otevřít časovou osu",
      action: "timing",
    };
  }

  if ((state.scenes ?? []).length > 1) {
    return {
      id: "ready-play",
      message: "Banner je připraven. Přehrajte scény a zkontrolujte časování.",
      actionLabel: "Přehrát vše",
      action: "play",
    };
  }

  return {
    id: "ready-export",
    message: "Banner vypadá hotově. Exportujte Sklik HTML5 ZIP a nahrajte do Skliku.",
    actionLabel: "Exportovat",
    action: "export",
  };
}

export function nextStepAfterAssetPlacement(
  kind: "logo" | "product" | "background" | "decoration" | "other",
): string | null {
  if (kind === "decoration" || kind === "other") {
    return "Soubor je v Média. Klikněte + Přidat na časovou osu.";
  }
  return "Soubor je v Média. Přidejte na časovou osu nebo vložte do vybraného slotu.";
}
