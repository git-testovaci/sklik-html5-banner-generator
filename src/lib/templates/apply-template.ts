import type { BannerEditorState } from "@/types/editor";
import type { BannerTemplateId } from "@/types/templates";
import {
  addLayerEffect,
  defaultScene,
  newId,
  syncFlatFromActiveScene,
} from "@/lib/animation/storyboard-utils";
import type { BannerLayer, BannerScene, LayerEffect } from "@/types/animation";
import { normalizeEditorState } from "@/lib/animation/timeline-utils";
import { getTemplateById } from "./banner-templates";

export function applyTemplateToState(
  state: BannerEditorState,
  templateId: BannerTemplateId,
): BannerEditorState {
  const template = getTemplateById(templateId);
  if (!template) return state;

  const { width, height } = state;
  const assets = state.assets ?? [];

  const assetPlacements = (state.assetPlacements ?? []).map((placement) => {
    const asset = assets.find((a) => a.id === placement.assetId);
    if (!asset) return placement;
    return template.assetPlacementsForKind(asset.kind, asset.id, width, height);
  });

  for (const asset of assets) {
    if (!assetPlacements.some((p) => p.assetId === asset.id)) {
      assetPlacements.push(
        template.assetPlacementsForKind(asset.kind, asset.id, width, height),
      );
    }
  }

  return normalizeEditorState({
    ...state,
    textPlacements: template.textPlacements(width, height),
    assetPlacements,
    layerAnimations: template.layerAnimations.map((a) => ({ ...a })),
    timeline: { ...template.timeline },
  });
}

export function applyIonicCareSequence(state: BannerEditorState): BannerEditorState {
  const { width, height } = state;
  const pad = Math.max(12, Math.round(Math.min(width, height) * 0.08));
  const now = new Date().toISOString();

  const logoAsset = (state.assets ?? []).find((a) => a.kind === "logo");
  const productAsset = (state.assets ?? []).find((a) => a.kind === "product");

  const logoLayer: BannerLayer = {
    id: logoAsset?.id ?? "logo",
    persistent: true,
    name: "Logo",
    type: "image",
    visible: true,
    locked: false,
    x: pad,
    y: height - pad - Math.round(height * 0.12),
    width: Math.round(width * 0.22),
    height: Math.round(height * 0.12),
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: 40,
    assetId: logoAsset?.id,
    fit: "contain",
    legacyKey: "logo",
  };

  function makeScene(
    name: string,
    durationMs: number,
    transitionOut: BannerScene["transitionOut"],
    buildLayers: (sceneId: string) => BannerLayer[],
  ): { scene: BannerScene; layers: BannerLayer[]; effects: LayerEffect[] } {
    const scene = { ...defaultScene(name, durationMs), transitionOut, updatedAt: now };
    const layers = buildLayers(scene.id);
    scene.layerIds = layers.filter((l) => !l.persistent).map((l) => l.id);
    const effects: LayerEffect[] = [];
    return { scene, layers, effects };
  }

  const s1 = makeScene("Intro", 3000, "swipe-left", (sceneId) => [
    logoLayer,
    {
      id: "headline",
      sceneId,
      persistent: false,
      name: "Headline",
      type: "text",
      visible: true,
      locked: false,
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: Math.round(height * 0.15),
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 30,
      text: state.headline || "Pure care for your skin",
      fontSize: Math.round(height * 0.07),
      fontWeight: 700,
      textAlign: "left",
      legacyKey: "headline",
    },
    {
      id: productAsset?.id ?? "product",
      sceneId,
      persistent: false,
      name: "Product",
      type: "image",
      visible: true,
      locked: false,
      x: Math.round(width * 0.28),
      y: Math.round(height * 0.22),
      width: Math.round(width * 0.44),
      height: Math.round(height * 0.5),
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 20,
      assetId: productAsset?.id,
      fit: "contain",
      shadow: true,
      legacyKey: "product",
    },
    {
      id: newId("underline"),
      sceneId,
      persistent: false,
      name: "Underline",
      type: "underline",
      visible: true,
      locked: false,
      x: pad,
      y: pad + Math.round(height * 0.14),
      width: Math.round(width * 0.35),
      height: 3,
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 31,
      underlineColor: state.accentColor,
      thickness: 3,
      drawDurationMs: 600,
      targetTextLayerId: "headline",
    },
    {
      id: newId("particle"),
      sceneId,
      persistent: false,
      name: "Dust particles",
      type: "particle",
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      width,
      height,
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 50,
      particleMode: "dust-to-clean",
      particleCount: 24,
      colors: ["#fbbf24", "#a78bfa", "#60a5fa"],
      speed: 1,
      particleLoop: true,
    },
  ]);

  const s2 = makeScene("Reveal", 3000, "swipe-left", (sceneId) => [
    logoLayer,
    {
      id: "headline-s2",
      sceneId,
      persistent: false,
      name: "Headline",
      type: "text",
      visible: true,
      locked: false,
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: Math.round(height * 0.15),
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 30,
      text: state.subheadline || "Breathe clean air",
      fontSize: Math.round(height * 0.065),
      fontWeight: 700,
      textAlign: "center",
      legacyKey: "headline",
    },
    {
      id: newId("product-s2"),
      sceneId,
      persistent: false,
      name: "Lung image",
      type: "image",
      visible: true,
      locked: false,
      x: Math.round(width * 0.3),
      y: Math.round(height * 0.25),
      width: Math.round(width * 0.4),
      height: Math.round(height * 0.45),
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 20,
      fit: "contain",
      legacyKey: "decoration",
    },
    {
      id: newId("underline-s2"),
      sceneId,
      persistent: false,
      name: "Underline",
      type: "underline",
      visible: true,
      locked: false,
      x: pad,
      y: pad + Math.round(height * 0.14),
      width: Math.round(width * 0.4),
      height: 3,
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 31,
      underlineColor: state.accentColor,
      thickness: 3,
      drawDurationMs: 600,
    },
    {
      id: newId("particle-s2"),
      sceneId,
      persistent: false,
      name: "Clean particles",
      type: "particle",
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      width,
      height,
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 50,
      particleMode: "floating-dots",
      particleCount: 18,
      colors: ["#60a5fa", "#93c5fd"],
      speed: 0.8,
      particleLoop: true,
    },
  ]);

  const s3 = makeScene("Lineup", 3500, "fade", (sceneId) => [
    logoLayer,
    {
      id: "headline-s3",
      sceneId,
      persistent: false,
      name: "Headline",
      type: "text",
      visible: true,
      locked: false,
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: Math.round(height * 0.12),
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 30,
      text: state.headline || "Complete care range",
      fontSize: Math.round(height * 0.06),
      fontWeight: 700,
      textAlign: "center",
      legacyKey: "headline",
    },
    ...[0, 1, 2].map((i) => ({
      id: newId(`lineup-${i}`),
      sceneId,
      persistent: false,
      name: `Product ${i + 1}`,
      type: "image" as const,
      visible: true,
      locked: false,
      x: pad + i * Math.round(width * 0.28),
      y: Math.round(height * 0.28),
      width: Math.round(width * 0.24),
      height: Math.round(height * 0.42),
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 15 + i,
      fit: "contain" as const,
      legacyKey: "decoration",
    })),
    {
      id: newId("badge"),
      sceneId,
      persistent: false,
      name: "Badge",
      type: "badge",
      visible: true,
      locked: false,
      x: Math.round(width * 0.72),
      y: Math.round(height * 0.2),
      width: Math.round(width * 0.2),
      height: Math.round(width * 0.2),
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 35,
      fit: "contain",
      legacyKey: "decoration",
    },
    {
      id: newId("circle-label"),
      sceneId,
      persistent: false,
      name: "Circle label",
      type: "shape",
      visible: true,
      locked: false,
      x: Math.round(width * 0.08),
      y: Math.round(height * 0.55),
      width: Math.round(width * 0.18),
      height: Math.round(width * 0.18),
      opacity: 1,
      rotation: 0,
      scale: 1,
      zIndex: 34,
      shapeType: "circle",
      fill: state.accentColor,
    },
  ]);

  const scenes = [s1.scene, s2.scene, s3.scene];
  const bannerLayers = [...s1.layers, ...s2.layers, ...s3.layers];
  const uniqueLayers = bannerLayers.filter(
    (l, i, arr) => arr.findIndex((x) => x.id === l.id) === i,
  );

  let next = normalizeEditorState({
    ...state,
    headline: state.headline || "Pure care for your skin",
    subheadline: state.subheadline || "Breathe clean air",
    scenes,
    bannerLayers: uniqueLayers,
    layerEffects: [],
    layerKeyframes: [],
    activeSceneId: s1.scene.id,
    timeline: { durationMs: 3000, loop: true, backgroundAnimation: "none" },
  });

  next = addLayerEffect(next, "headline", "slight-drop-in");
  next = addLayerEffect(next, logoLayer.id, "fade-in");
  const badge = uniqueLayers.find((l) => l.name === "Badge");
  if (badge) next = addLayerEffect(next, badge.id, "flip-180");
  const circle = uniqueLayers.find((l) => l.name === "Circle label");
  if (circle) next = addLayerEffect(next, circle.id, "zoom-rotate-badge");

  return syncFlatFromActiveScene(next);
}
