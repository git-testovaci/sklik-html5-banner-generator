import type { BannerEditorState } from "@/types/editor";
import {
  escapeHtmlAttribute,
  escapeHtmlText,
  sanitizePlainText,
} from "./sanitize-export-content";

export function generateBannerHtml(state: BannerEditorState): string {
  const title = escapeHtmlText(sanitizePlainText(state.name, "Banner", 80));
  const headline = escapeHtmlText(
    sanitizePlainText(state.headline, "Headline", 120),
  );
  const subheadline = escapeHtmlText(
    sanitizePlainText(state.subheadline, "Subheadline", 160),
  );
  const cta = escapeHtmlText(sanitizePlainText(state.cta, "Learn more", 40));
  const logo = escapeHtmlText(
    sanitizePlainText(state.logoLabel, "Logo", 24),
  );
  const product = escapeHtmlText(
    sanitizePlainText(state.productImageLabel, "Product", 24),
  );
  const animClass =
    state.animation === "none" ? "" : ` anim-${state.animation}`;

  return `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="ad.size" content="width=${state.width},height=${state.height}">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="banner" class="banner${animClass}" role="img" aria-label="${escapeHtmlAttribute(title)}">
    <div class="banner__logo">${logo}</div>
    <div class="banner__content">
      <h1 class="banner__headline">${headline}</h1>
      <p class="banner__subheadline">${subheadline}</p>
      <span class="banner__cta">${cta}</span>
    </div>
    <div class="banner__product">${product}</div>
  </div>
  <script src="script.js"></script>
</body>
</html>
`;
}
