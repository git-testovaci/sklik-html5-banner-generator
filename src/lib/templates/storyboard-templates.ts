import type {
  BannerLayer,
  BannerScene,
  BannerSceneTransition,
  LayerEffect,
} from "@/types/animation";
import type { BannerEditorState } from "@/types/editor";
import type {
  StoryboardTemplateId,
  TemplateEffectSpec,
} from "@/types/storyboard-templates";
import {
  addLayerEffect,
  defaultScene,
  syncFlatFromActiveScene,
} from "@/lib/animation/storyboard-utils";
import { normalizeEditorState } from "@/lib/animation/timeline-utils";
import type { StoryboardTemplateDefinition } from "@/types/storyboard-templates";

interface TemplateCtx {
  width: number;
  height: number;
  pad: number;
  state: BannerEditorState;
  logoAssetId?: string;
  productAssetId?: string;
}

interface SceneSpec {
  name: string;
  durationMs: number;
  transitionOut: BannerSceneTransition;
  backgroundColor?: string;
  buildLayers: (ctx: TemplateCtx, sceneId: string, refs: Map<string, string>) => BannerLayer[];
  effects: TemplateEffectSpec[];
}

function padFor(w: number, h: number): number {
  return Math.max(12, Math.round(Math.min(w, h) * 0.08));
}

function textLayer(
  ref: string,
  sceneId: string,
  name: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  opts: Partial<BannerLayer> = {},
): BannerLayer {
  return {
    id: ref,
    sceneId,
    persistent: false,
    name,
    type: "text",
    visible: true,
    locked: false,
    x,
    y,
    width,
    height,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: opts.zIndex ?? 30,
    text,
    fontSize: opts.fontSize ?? 14,
    fontWeight: opts.fontWeight ?? 700,
    textAlign: opts.textAlign ?? "left",
    lineHeight: opts.lineHeight ?? 1.15,
    legacyKey: opts.legacyKey,
    color: opts.color,
  };
}

function productFrame(
  ref: string,
  sceneId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  assetId?: string,
): BannerLayer {
  return {
    id: ref,
    sceneId,
    persistent: false,
    name: "Produkt",
    type: assetId ? "image" : "badge",
    visible: true,
    locked: false,
    x,
    y,
    width,
    height,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: 20,
    assetId,
    fit: "contain",
    shadow: true,
    legacyKey: assetId ? "product" : "decoration",
    isTemplateSlot: !assetId,
    slotId: ref,
    slotKind: "product",
    slotLabel: "Nahrát produkt",
  };
}

function persistentLogo(ctx: TemplateCtx): BannerLayer {
  const { width, height, pad, logoAssetId } = ctx;
  return {
    id: logoAssetId ?? "logo-wordmark",
    persistent: true,
    name: "Logo",
    type: logoAssetId ? "image" : "badge",
    visible: true,
    locked: false,
    x: pad,
    y: height - pad - Math.round(height * 0.11),
    width: Math.round(width * 0.24),
    height: Math.round(height * 0.1),
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: 45,
    assetId: logoAssetId,
    fit: "contain",
    legacyKey: "logo",
    text: logoAssetId ? undefined : undefined,
    fontSize: Math.round(height * 0.045),
    fontWeight: 700,
    textAlign: "center",
    color: ctx.state.textColor,
    isTemplateSlot: !logoAssetId,
    slotId: logoAssetId ?? "logo-wordmark",
    slotKind: "logo",
    slotLabel: "Nahrát logo",
  };
}

function underlineLayer(
  ref: string,
  sceneId: string,
  x: number,
  y: number,
  width: number,
  color: string,
): BannerLayer {
  return {
    id: ref,
    sceneId,
    persistent: false,
    name: "Underline effect",
    type: "underline",
    visible: true,
    locked: false,
    x,
    y,
    width,
    height: 4,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: 31,
    underlineColor: color,
    thickness: 3,
    drawDurationMs: 650,
  };
}

function particleLayer(
  ref: string,
  sceneId: string,
  ctx: TemplateCtx,
  mode: BannerLayer["particleMode"],
  count: number,
  colors: string[],
): BannerLayer {
  return {
    id: ref,
    sceneId,
    persistent: false,
    name: mode === "dust-to-clean" ? "Dust particles" : "Clean air particles",
    type: "particle",
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width: ctx.width,
    height: ctx.height,
    opacity: 0.85,
    rotation: 0,
    scale: 1,
    zIndex: 50,
    particleMode: mode,
    particleCount: Math.min(count, 32),
    colors,
    speed: 1,
    particleLoop: true,
  };
}

function badgeShape(
  ref: string,
  sceneId: string,
  label: string,
  x: number,
  y: number,
  size: number,
  fill: string,
): BannerLayer {
  return {
    id: ref,
    sceneId,
    persistent: false,
    name: "Badge",
    type: "badge",
    visible: true,
    locked: false,
    x,
    y,
    width: size,
    height: size,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: 35,
    text: label,
    fontSize: Math.max(9, Math.round(size * 0.22)),
    fontWeight: 700,
    textAlign: "center",
    fill,
    legacyKey: "decoration",
  };
}

function circleShape(
  ref: string,
  sceneId: string,
  label: string,
  x: number,
  y: number,
  size: number,
  fill: string,
): BannerLayer {
  return {
    id: ref,
    sceneId,
    persistent: false,
    name: "Circle placeholder",
    type: "shape",
    visible: true,
    locked: false,
    x,
    y,
    width: size,
    height: size,
    opacity: 1,
    rotation: 0,
    scale: 1,
    zIndex: 34,
    shapeType: "circle",
    fill,
    text: label,
    fontSize: Math.max(8, Math.round(size * 0.18)),
    fontWeight: 700,
    textAlign: "center",
    color: "#fff",
  };
}

function ctaLayer(
  ref: string,
  sceneId: string,
  text: string,
  ctx: TemplateCtx,
): BannerLayer {
  const { width, height, pad } = ctx;
  return textLayer(
    ref,
    sceneId,
    "CTA",
    text,
    pad,
    height - pad - Math.round(height * 0.22),
    Math.round(width * 0.42),
    Math.round(height * 0.11),
    {
      legacyKey: "cta",
      zIndex: 36,
      fontSize: Math.round(height * 0.055),
      fontWeight: 600,
      textAlign: "center",
    },
  );
}

function buildFromScenes(
  state: BannerEditorState,
  scenes: SceneSpec[],
  headline?: string,
  subheadline?: string,
): BannerEditorState {
  const ctx: TemplateCtx = {
    width: state.width,
    height: state.height,
    pad: padFor(state.width, state.height),
    state,
    logoAssetId: (state.assets ?? []).find((a) => a.kind === "logo")?.id,
    productAssetId: (state.assets ?? []).find((a) => a.kind === "product")?.id,
  };

  const logo = persistentLogo(ctx);
  const refs = new Map<string, string>();
  const builtScenes: BannerScene[] = [];
  const layers: BannerLayer[] = [logo];
  const effects: LayerEffect[] = [];

  for (const spec of scenes) {
    const scene = {
      ...defaultScene(spec.name, spec.durationMs),
      transitionOut: spec.transitionOut,
      backgroundColor: spec.backgroundColor ?? state.backgroundColor,
    };
    const sceneLayers = spec.buildLayers(ctx, scene.id, refs);
    scene.layerIds = sceneLayers.filter((l) => !l.persistent).map((l) => l.id);
    builtScenes.push(scene);
    layers.push(...sceneLayers);
  }

  const uniqueLayers = layers.filter(
    (l, i, arr) => arr.findIndex((x) => x.id === l.id) === i,
  );

  let next = normalizeEditorState({
    ...state,
    headline: headline ?? state.headline,
    subheadline: subheadline ?? state.subheadline,
    scenes: builtScenes,
    bannerLayers: uniqueLayers,
    layerEffects: effects,
    layerKeyframes: [],
    activeSceneId: builtScenes[0]?.id,
    timeline: {
      durationMs: scenes[0]?.durationMs ?? 3000,
      loop: true,
      backgroundAnimation: "none",
    },
    textPlacements: undefined,
    assetPlacements: undefined,
    layerAnimations: undefined,
  });

  for (const spec of scenes) {
    const scene = builtScenes.find((s) => s.name === spec.name);
    if (!scene) continue;
    for (const fx of spec.effects) {
      const layerId = refs.get(fx.layerRef) ?? fx.layerRef;
      next = addLayerEffect(next, layerId, fx.preset);
      const last = (next.layerEffects ?? [])[next.layerEffects!.length - 1];
      if (last && (fx.startMs !== undefined || fx.durationMs !== undefined)) {
        next = {
          ...next,
          layerEffects: (next.layerEffects ?? []).map((e) =>
            e.id === last.id
              ? {
                  ...e,
                  startMs: fx.startMs ?? e.startMs,
                  durationMs: fx.durationMs ?? e.durationMs,
                }
              : e,
          ),
        };
      }
    }
  }

  return syncFlatFromActiveScene(next);
}

export const STORYBOARD_TEMPLATES: StoryboardTemplateDefinition[] = [
  {
    id: "clean-air-product",
    name: "Čistý vzduch — produktový storyboard",
    description: "3 scény s logem, produktem, částicemi a podtržením.",
    category: "product",
    sceneCount: 3,
    keyEffects: ["Spadne na místo", "Částice", "Podtržení", "Otočení odznaku", "Přechod doleva"],
    useCase: "Produktové kampaně, čističky vzduchu, zdraví domova",
    recommended: true,
    totalDurationMs: 9500,
    transitionStyle: "Přechod doleva",
    requiredSlots: [
      { kind: "logo", label: "Logo", required: true },
      { kind: "product", label: "Produkt", required: false },
    ],
  },
  {
    id: "flash-sale",
    name: "Flash sleva",
    description: "Sleva, produkt a pulzující CTA.",
    category: "sale",
    sceneCount: 3,
    keyEffects: ["Přiblížení", "Najetí", "Jemný pohyb", "Posun"],
    useCase: "E-commerce akce a výprodeje",
    totalDurationMs: 9000,
    transitionStyle: "Posun doleva",
    requiredSlots: [
      { kind: "product", label: "Produkt", required: true },
      { kind: "logo", label: "Logo", required: false },
    ],
  },
  {
    id: "premium-launch",
    name: "Prémiové uvedení",
    description: "Elegantní odhalení a hero produkt.",
    category: "product",
    sceneCount: 3,
    keyEffects: ["Přiblížení", "Postupně", "Otočení odznaku"],
    useCase: "Launch novinek a prémiových produktů",
    totalDurationMs: 10000,
    transitionStyle: "Prolnutí",
    requiredSlots: [
      { kind: "logo", label: "Logo", required: true },
      { kind: "product", label: "Produkt", required: true },
    ],
  },
  {
    id: "health-wellness",
    name: "Zdraví a wellness",
    description: "Problém → řešení s částicemi a CTA.",
    category: "product",
    sceneCount: 3,
    keyEffects: ["Přijede shora", "Částice", "Podtržení"],
    useCase: "Wellness, péče o zdraví",
    totalDurationMs: 9600,
    transitionStyle: "Přechod doleva",
    requiredSlots: [
      { kind: "logo", label: "Logo", required: false },
      { kind: "product", label: "Produkt", required: true },
    ],
  },
  {
    id: "finance-trust",
    name: "Finance a důvěra",
    description: "Důvěryhodný nadpis, čísla a CTA.",
    category: "trust",
    sceneCount: 3,
    keyEffects: ["Prolnutí", "Zvětšení textu", "Odznak"],
    useCase: "Pojištění, finance, služby",
    totalDurationMs: 9000,
    transitionStyle: "Prolnutí",
    requiredSlots: [{ kind: "logo", label: "Logo", required: true }],
  },
  {
    id: "travel-holiday",
    name: "Cestování a dovolená",
    description: "Destinace, cena a výzva k akci.",
    category: "travel",
    sceneCount: 3,
    keyEffects: ["Najetí", "Otočení odznaku", "Přechod doleva"],
    useCase: "Cestovní kanceláře a hotely",
    totalDurationMs: 9600,
    transitionStyle: "Přechod doleva",
    requiredSlots: [
      { kind: "background", label: "Pozadí", required: false },
      { kind: "product", label: "Destinace", required: false },
    ],
  },
  {
    id: "saas-app",
    name: "SaaS / aplikace",
    description: "UI karta, feature chips a trial CTA.",
    category: "saas",
    sceneCount: 3,
    keyEffects: ["Najetí", "Postupně", "Jemný pohyb CTA"],
    useCase: "Webové aplikace a SaaS",
    totalDurationMs: 9600,
    transitionStyle: "Posun doleva",
    requiredSlots: [
      { kind: "logo", label: "Logo", required: true },
      { kind: "product", label: "Screenshot", required: true },
    ],
  },
  {
    id: "local-service",
    name: "Místní služby",
    description: "Problém, benefity a kontakt CTA.",
    category: "local",
    sceneCount: 3,
    keyEffects: ["Spadne na místo", "Odhalení", "Prolnutí CTA"],
    useCase: "Řemeslníci, servis, lokální firmy",
    totalDurationMs: 9000,
    transitionStyle: "Prolnutí",
    requiredSlots: [{ kind: "logo", label: "Logo", required: true }],
  },
];

export function getStoryboardTemplate(
  id: StoryboardTemplateId,
): StoryboardTemplateDefinition | undefined {
  return STORYBOARD_TEMPLATES.find((t) => t.id === id);
}

function buildCleanAirProduct(state: BannerEditorState): BannerEditorState {
  const { width, height } = state;
  const pad = padFor(width, height);
  const accent = state.accentColor;

  return buildFromScenes(
    state,
    [
      {
        name: "Úvod",
        durationMs: 3200,
        transitionOut: "swipe-left",
        buildLayers: (ctx, sceneId, refs) => {
          refs.set("headline", "s1-headline");
          refs.set("product", "s1-product");
          refs.set("underline", "s1-underline");
          refs.set("particles", "s1-particles");
          return [
            textLayer(
              "s1-headline",
              sceneId,
              "Nadpis",
              "Čistší vzduch za pár minut",
              pad,
              pad,
              width - pad * 2,
              Math.round(height * 0.14),
              { fontSize: Math.round(height * 0.068), legacyKey: "headline" },
            ),
            textLayer(
              "s1-sub",
              sceneId,
              "Podnadpis",
              "Filtr zachytí prach, pyl i jemné částice.",
              pad,
              pad + Math.round(height * 0.15),
              width - pad * 2,
              Math.round(height * 0.1),
              {
                fontSize: Math.round(height * 0.042),
                fontWeight: 400,
                legacyKey: "subheadline",
              },
            ),
            productFrame(
              "s1-product",
              sceneId,
              Math.round(width * 0.3),
              Math.round(height * 0.28),
              Math.round(width * 0.4),
              Math.round(height * 0.42),
              ctx.productAssetId,
            ),
            underlineLayer(
              "s1-underline",
              sceneId,
              pad,
              pad + Math.round(height * 0.13),
              Math.round(width * 0.38),
              accent,
            ),
            particleLayer("s1-particles", sceneId, ctx, "dust-to-clean", 24, [
              "#fbbf24",
              accent,
              "#60a5fa",
            ]),
          ];
        },
        effects: [
          { layerRef: "headline", preset: "slight-drop-in", startMs: 0 },
          { layerRef: "product", preset: "slide-in-left", startMs: 250 },
          { layerRef: "underline", preset: "underline-draw", startMs: 500 },
        ],
      },
      {
        name: "Odhalení",
        durationMs: 3100,
        transitionOut: "swipe-left",
        buildLayers: (ctx, sceneId, refs) => {
          refs.set("headline", "s2-headline");
          refs.set("image", "s2-image");
          refs.set("underline", "s2-underline");
          refs.set("particles", "s2-particles");
          return [
            textLayer(
              "s2-headline",
              sceneId,
              "Nadpis",
              "Dýchejte lehčeji doma i v práci",
              pad,
              pad,
              width - pad * 2,
              Math.round(height * 0.14),
              {
                fontSize: Math.round(height * 0.062),
                textAlign: "center",
                legacyKey: "headline",
              },
            ),
            textLayer(
              "s2-sub",
              sceneId,
              "Podnadpis",
              "Tichý provoz a výkon pro každý den.",
              pad,
              pad + Math.round(height * 0.16),
              width - pad * 2,
              Math.round(height * 0.1),
              {
                fontSize: Math.round(height * 0.04),
                fontWeight: 400,
                textAlign: "center",
                legacyKey: "subheadline",
              },
            ),
            productFrame(
              "s2-image",
              sceneId,
              Math.round(width * 0.32),
              Math.round(height * 0.3),
              Math.round(width * 0.36),
              Math.round(height * 0.38),
            ),
            underlineLayer(
              "s2-underline",
              sceneId,
              Math.round(width * 0.22),
              pad + Math.round(height * 0.14),
              Math.round(width * 0.35),
              accent,
            ),
            particleLayer("s2-particles", sceneId, ctx, "floating-dots", 20, [
              "#93c5fd",
              "#60a5fa",
            ]),
          ];
        },
        effects: [
          { layerRef: "headline", preset: "enter-from-top", startMs: 0 },
          { layerRef: "image", preset: "fade-in", startMs: 200 },
          { layerRef: "underline", preset: "underline-draw", startMs: 450 },
        ],
      },
      {
        name: "Výběr",
        durationMs: 3200,
        transitionOut: "fade",
        buildLayers: (ctx, sceneId, refs) => {
          refs.set("headline", "s3-headline");
          refs.set("badge", "s3-badge");
          refs.set("circle", "s3-circle");
          refs.set("cta", "s3-cta");
          const lineup: BannerLayer[] = [
            textLayer(
              "s3-headline",
              sceneId,
              "Nadpis",
              "Vyberte čističku pro svůj prostor",
              pad,
              pad,
              width - pad * 2,
              Math.round(height * 0.12),
              {
                fontSize: Math.round(height * 0.055),
                textAlign: "center",
                legacyKey: "headline",
              },
            ),
            ctaLayer("s3-cta", sceneId, "Zjistit více", ctx),
            badgeShape(
              "s3-badge",
              sceneId,
              "TOP volba",
              Math.round(width * 0.68),
              Math.round(height * 0.18),
              Math.round(width * 0.22),
              accent,
            ),
            circleShape(
              "s3-circle",
              sceneId,
              "Až -20 %",
              Math.round(width * 0.06),
              Math.round(height * 0.52),
              Math.round(width * 0.18),
              state.ctaBackgroundColor,
            ),
          ];
          for (let i = 0; i < 3; i++) {
            const id = `s3-lineup-${i}`;
            refs.set(`lineup-${i}`, id);
            lineup.push(
              productFrame(
                id,
                sceneId,
                pad + i * Math.round(width * 0.28),
                Math.round(height * 0.28),
                Math.round(width * 0.22),
                Math.round(height * 0.38),
              ),
            );
          }
          return lineup;
        },
        effects: [
          { layerRef: "headline", preset: "fade-in", startMs: 0 },
          { layerRef: "lineup-0", preset: "slide-in-left", startMs: 200 },
          { layerRef: "lineup-1", preset: "slide-in-left", startMs: 350 },
          { layerRef: "lineup-2", preset: "slide-in-left", startMs: 500 },
          { layerRef: "badge", preset: "flip-180", startMs: 700 },
          { layerRef: "circle", preset: "zoom-rotate-badge", startMs: 850 },
          { layerRef: "cta", preset: "float-subtle", startMs: 1000, durationMs: 1200 },
        ],
      },
    ],
    "Čistší vzduch za pár minut",
    "Filtr zachytí prach, pyl i jemné částice.",
  );
}

function buildFlashSale(state: BannerEditorState): BannerEditorState {
  const { width, height } = state;
  const pad = padFor(width, height);
  return buildFromScenes(state, [
    {
      name: "Sleva",
      durationMs: 2800,
      transitionOut: "push-left",
      buildLayers: (ctx, sceneId, refs) => {
        refs.set("discount", "fs-discount");
        return [
          textLayer(
            "fs-discount",
            sceneId,
            "Discount",
            "−30 %",
            Math.round(width * 0.08),
            Math.round(height * 0.2),
            Math.round(width * 0.5),
            Math.round(height * 0.35),
            { fontSize: Math.round(height * 0.14), legacyKey: "headline", zIndex: 32 },
          ),
          textLayer(
            "fs-tag",
            sceneId,
            "Tag",
            "Flash sleva",
            pad,
            pad,
            Math.round(width * 0.5),
            Math.round(height * 0.12),
            { fontSize: Math.round(height * 0.055), legacyKey: "subheadline" },
          ),
        ];
      },
      effects: [{ layerRef: "discount", preset: "zoom-in", startMs: 0 }],
    },
    {
      name: "Produkt",
      durationMs: 3000,
      transitionOut: "push-left",
      buildLayers: (ctx, sceneId, refs) => {
        refs.set("product", "fs-product");
        refs.set("deadline", "fs-deadline");
        return [
          textLayer(
            "fs-deadline",
            sceneId,
            "Deadline",
            "Jen do neděle",
            pad,
            pad,
            width - pad * 2,
            Math.round(height * 0.12),
            { fontSize: Math.round(height * 0.05), legacyKey: "headline" },
          ),
          productFrame(
            "fs-product",
            sceneId,
            Math.round(width * 0.25),
            Math.round(height * 0.25),
            Math.round(width * 0.5),
            Math.round(height * 0.5),
            ctx.productAssetId,
          ),
        ];
      },
      effects: [
        { layerRef: "product", preset: "slide-in-right", startMs: 150 },
        { layerRef: "deadline", preset: "enter-from-left", startMs: 0 },
      ],
    },
    {
      name: "CTA",
      durationMs: 3200,
      transitionOut: "fade",
      buildLayers: (ctx, sceneId, refs) => {
        refs.set("cta", "fs-cta");
        return [
          textLayer(
            "fs-cta",
            sceneId,
            "CTA",
            "Vyberte si ještě dnes",
            Math.round(width * 0.15),
            Math.round(height * 0.38),
            Math.round(width * 0.7),
            Math.round(height * 0.14),
            {
              fontSize: Math.round(height * 0.06),
              textAlign: "center",
              legacyKey: "cta",
              zIndex: 35,
            },
          ),
        ];
      },
      effects: [{ layerRef: "cta", preset: "float-subtle", startMs: 200, durationMs: 1400 }],
    },
  ]);
}

function buildGenericThreeScene(
  state: BannerEditorState,
  config: {
    s1: { title: string; sub: string; transition: BannerSceneTransition; name?: string };
    s2: { title: string; sub: string; transition: BannerSceneTransition; name?: string };
    s3: { title: string; cta: string; transition: BannerSceneTransition; name?: string };
    accent?: string;
  },
): BannerEditorState {
  const { width, height } = state;
  const pad = padFor(width, height);
  const accent = config.accent ?? state.accentColor;

  return buildFromScenes(
    state,
    [
      {
        name: config.s1.name ?? "Úvod",
        durationMs: 3200,
        transitionOut: config.s1.transition,
        buildLayers: (ctx, sceneId, refs) => {
          refs.set("h1", "g-h1");
          refs.set("p1", "g-p1");
          return [
            textLayer("g-h1", sceneId, "Nadpis", config.s1.title, pad, pad, width - pad * 2, Math.round(height * 0.14), {
              fontSize: Math.round(height * 0.06),
              legacyKey: "headline",
            }),
            textLayer("g-p1", sceneId, "Sub", config.s1.sub, pad, pad + Math.round(height * 0.16), width - pad * 2, Math.round(height * 0.1), {
              fontSize: Math.round(height * 0.042),
              fontWeight: 400,
              legacyKey: "subheadline",
            }),
            particleLayer("g-p1-particles", sceneId, ctx, "floating-dots", 16, [accent, "#fff"]),
          ];
        },
        effects: [
          { layerRef: "h1", preset: "slight-drop-in" },
          { layerRef: "p1", preset: "fade-in", startMs: 200 },
        ],
      },
      {
        name: config.s2.name ?? "Detail",
        durationMs: 3200,
        transitionOut: config.s2.transition,
        buildLayers: (ctx, sceneId, refs) => {
          refs.set("h2", "g-h2");
          refs.set("frame", "g-frame");
          return [
            textLayer("g-h2", sceneId, "Nadpis", config.s2.title, pad, pad, width - pad * 2, Math.round(height * 0.14), {
              fontSize: Math.round(height * 0.058),
              textAlign: "center",
              legacyKey: "headline",
            }),
            textLayer("g-s2", sceneId, "Sub", config.s2.sub, pad, pad + Math.round(height * 0.16), width - pad * 2, Math.round(height * 0.1), {
              fontSize: Math.round(height * 0.04),
              textAlign: "center",
              legacyKey: "subheadline",
            }),
            productFrame("g-frame", sceneId, Math.round(width * 0.28), Math.round(height * 0.28), Math.round(width * 0.44), Math.round(height * 0.45), ctx.productAssetId),
            underlineLayer("g-ul", sceneId, pad, pad + Math.round(height * 0.14), Math.round(width * 0.4), accent),
          ];
        },
        effects: [
          { layerRef: "h2", preset: "enter-from-top" },
          { layerRef: "frame", preset: "slide-in-left", startMs: 250 },
          { layerRef: "g-ul", preset: "underline-draw", startMs: 500 },
        ],
      },
      {
        name: config.s3.name ?? "Výzva",
        durationMs: 3300,
        transitionOut: config.s3.transition,
        buildLayers: (ctx, sceneId, refs) => {
          refs.set("h3", "g-h3");
          refs.set("cta", "g-cta");
          refs.set("badge", "g-badge");
          return [
            textLayer("g-h3", sceneId, "Nadpis", config.s3.title, pad, pad, width - pad * 2, Math.round(height * 0.12), {
              fontSize: Math.round(height * 0.055),
              textAlign: "center",
              legacyKey: "headline",
            }),
            ctaLayer("g-cta", sceneId, config.s3.cta, ctx),
            badgeShape("g-badge", sceneId, "Novinka", Math.round(width * 0.7), Math.round(height * 0.2), Math.round(width * 0.2), accent),
          ];
        },
        effects: [
          { layerRef: "h3", preset: "fade-in" },
          { layerRef: "badge", preset: "flip-180", startMs: 400 },
          { layerRef: "cta", preset: "float-subtle", startMs: 600, durationMs: 1200 },
        ],
      },
    ],
    config.s1.title,
    config.s1.sub,
  );
}

const BUILDERS: Record<StoryboardTemplateId, (state: BannerEditorState) => BannerEditorState> = {
  "clean-air-product": buildCleanAirProduct,
  "flash-sale": buildFlashSale,
  "premium-launch": (s) =>
    buildGenericThreeScene(s, {
      s1: { title: "Novinka, která zaujme", sub: "Prémiový design. Chytré funkce.", transition: "fade", name: "Odhalení" },
      s2: { title: "Detaily, které cítíte", sub: "Kvalita v každém detailu.", transition: "push-left", name: "Funkce" },
      s3: { title: "Objevte více", cta: "Objevte více", transition: "fade", name: "Hero" },
    }),
  "health-wellness": (s) =>
    buildGenericThreeScene(s, {
      s1: { title: "Každý nádech se počítá", sub: "Méně prachu. Více klidu.", transition: "swipe-left", name: "Problém" },
      s2: { title: "Čistší prostředí", sub: "Jemné částice pryč z domova.", transition: "swipe-left", name: "Řešení" },
      s3: { title: "Začněte dnes", cta: "Začněte dnes", transition: "fade", name: "Výzva" },
    }),
  "finance-trust": (s) =>
    buildGenericThreeScene(s, {
      s1: { title: "Mějte jistotu v každé situaci", sub: "Rychlé sjednání online.", transition: "fade", name: "Důvěra" },
      s2: { title: "Transparentní podmínky", sub: "Bez skrytých poplatků.", transition: "push-left", name: "Čísla" },
      s3: { title: "Spočítat nabídku", cta: "Spočítat nabídku", transition: "fade", name: "Akce" },
    }),
  "travel-holiday": (s) =>
    buildGenericThreeScene(s, {
      s1: { title: "Léto začíná tady", sub: "Vyberte si dovolenou snů.", transition: "swipe-left", name: "Destinace" },
      s2: { title: "Last minute nabídky", sub: "Oblíbené destinace.", transition: "swipe-right", name: "Cena" },
      s3: { title: "Zobrazit nabídky", cta: "Zobrazit nabídky", transition: "swipe-left", name: "Rezervace" },
    }),
  "saas-app": (s) =>
    buildGenericThreeScene(s, {
      s1: { title: "Zjednodušte každodenní práci", sub: "Přehled. Automatizace. Výsledky.", transition: "push-left", name: "UI karta" },
      s2: { title: "Vše na jednom místě", sub: "Rychlejší workflow pro tým.", transition: "push-left", name: "Funkce" },
      s3: { title: "Vyzkoušet zdarma", cta: "Vyzkoušet zdarma", transition: "push-left", name: "Trial" },
    }),
  "local-service": (s) =>
    buildGenericThreeScene(s, {
      s1: { title: "Potřebujete rychlé řešení?", sub: "Domluva online. Férová cena.", transition: "swipe-left", name: "Problém" },
      s2: { title: "Spolehlivý servis", sub: "Rychlá reakce a jasná nabídka.", transition: "swipe-left", name: "Benefity" },
      s3: { title: "Nezávazně poptat", cta: "Nezávazně poptat", transition: "fade", name: "Kontakt" },
    }),
};

export function applyStoryboardTemplate(
  state: BannerEditorState,
  templateId: StoryboardTemplateId,
): BannerEditorState {
  const builder = BUILDERS[templateId];
  if (!builder) return state;
  return builder(state);
}

/** @deprecated Use applyStoryboardTemplate(state, "clean-air-product") */
export function applyIonicCareSequence(state: BannerEditorState): BannerEditorState {
  return applyStoryboardTemplate(state, "clean-air-product");
}

export const STORYBOARD_TEMPLATE_CATEGORIES: {
  id: StoryboardTemplateDefinition["category"];
  label: string;
}[] = [
  { id: "product", label: "Produkt" },
  { id: "sale", label: "Sleva" },
  { id: "trust", label: "Důvěra" },
  { id: "travel", label: "Cestování" },
  { id: "saas", label: "SaaS" },
  { id: "local", label: "Místní služby" },
];
