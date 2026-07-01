import type { ClassicBannerDesignTokens } from "@/types/classic-banner";
import type { ClassicBannerPixelRect } from "@/lib/classic-banner/classic-banner-rendering";

export function wrapClassicHeadlineLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      if (lines.length < maxLines) lines.push("");
      continue;
    }

    let current = words[0] ?? "";
    for (let i = 1; i < words.length; i++) {
      const word = words[i]!;
      const candidate = `${current} ${word}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
        if (lines.length >= maxLines) return lines.slice(0, maxLines);
      }
    }
    lines.push(current);
    if (lines.length >= maxLines) return lines.slice(0, maxLines);
  }

  return lines.slice(0, maxLines);
}

export function measureClassicCtaButtonRect(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: ClassicBannerPixelRect,
  tokens: ClassicBannerDesignTokens,
  fontSize: number,
  paddingX: number,
  paddingY: number,
): ClassicBannerPixelRect {
  ctx.font = `${tokens.headlineFontWeight} ${fontSize}px ${tokens.fontFamily}`;
  const textWidth = ctx.measureText(text).width;
  const width = Math.min(box.width, textWidth + paddingX * 2);
  const height = Math.min(box.height, fontSize + paddingY * 2);
  return {
    x: box.x,
    y: box.y + box.height - height,
    width,
    height,
  };
}

export function measureClassicBadgePillRect(
  ctx: CanvasRenderingContext2D,
  text: string,
  box: ClassicBannerPixelRect,
  tokens: ClassicBannerDesignTokens,
  fontSize: number,
): ClassicBannerPixelRect {
  ctx.font = `600 ${fontSize}px ${tokens.fontFamily}`;
  const textWidth = ctx.measureText(text).width;
  const horizontalPadding = 16;
  const verticalPadding = 6;
  const width = Math.min(box.width, Math.max(textWidth + horizontalPadding, fontSize * 2));
  const height = Math.min(box.height, fontSize + verticalPadding);
  return {
    x: box.x + box.width - width,
    y: box.y,
    width,
    height,
  };
}

export async function awaitClassicBannerCanvasFonts(
  tokens: ClassicBannerDesignTokens,
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  await Promise.all([
    document.fonts.load(`${tokens.headlineFontWeight} 16px ${tokens.fontFamily}`),
    document.fonts.load(`${tokens.bodyFontWeight} 16px ${tokens.fontFamily}`),
    document.fonts.load(`600 16px ${tokens.fontFamily}`),
    document.fonts.ready,
  ]);
}
