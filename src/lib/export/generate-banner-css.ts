import type { BannerEditorState } from "@/types/editor";
import { sanitizeCssColor } from "./sanitize-export-content";

function fontSize(width: number, height: number, base: number): string {
  const scale = Math.min(width, height) / 300;
  return `${Math.max(9, Math.round(base * scale))}px`;
}

export function generateBannerCss(state: BannerEditorState): string {
  const bg = sanitizeCssColor(state.backgroundColor, "#0f172a");
  const text = sanitizeCssColor(state.textColor, "#f8fafc");
  const ctaBg = sanitizeCssColor(state.ctaBackgroundColor, "#7c3aed");
  const ctaText = sanitizeCssColor(state.ctaTextColor, "#ffffff");
  const accent = sanitizeCssColor(state.accentColor, "#a78bfa");

  const headlineSize = fontSize(state.width, state.height, 16);
  const subSize = fontSize(state.width, state.height, 11);
  const ctaSize = fontSize(state.width, state.height, 11);
  const labelSize = fontSize(state.width, state.height, 9);

  const animationBlock =
    state.animation === "none"
      ? ""
      : `
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes soft-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.015); }
}
.anim-fade-in { animation: fade-in 0.8s ease-out forwards; }
.anim-slide-up { animation: slide-up 0.7s ease-out forwards; }
.anim-soft-pulse { animation: soft-pulse 2.4s ease-in-out infinite; }
`;

  return `*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  width: ${state.width}px;
  height: ${state.height}px;
  overflow: hidden;
}
body {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: ${bg};
  color: ${text};
}
.banner {
  width: ${state.width}px;
  height: ${state.height}px;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: ${bg};
  color: ${text};
}
.banner__logo {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 28px;
  padding: 4px 6px;
  border: 1px solid ${accent};
  background: ${bg};
  color: ${accent};
  font-size: ${labelSize};
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.banner__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
.banner__headline {
  margin: 0;
  font-size: ${headlineSize};
  line-height: 1.15;
  font-weight: 700;
}
.banner__subheadline {
  margin: 0;
  font-size: ${subSize};
  line-height: 1.25;
  opacity: 0.88;
}
.banner__cta {
  display: inline-block;
  align-self: flex-start;
  margin-top: 4px;
  padding: 5px 10px;
  border-radius: 4px;
  background: ${ctaBg};
  color: ${ctaText};
  font-size: ${ctaSize};
  font-weight: 600;
  line-height: 1.2;
}
.banner__product {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  min-height: 56px;
  max-width: 38%;
  padding: 6px;
  border: 1px dashed ${accent};
  background: ${bg};
  color: ${accent};
  font-size: ${labelSize};
  text-align: center;
}
${animationBlock}`;
}
