"use client";

import { useMemo } from "react";
import { computeClassicBannerLayout } from "@/lib/classic-banner/classic-banner-layout";
import { isClassicBannerSlotVisible } from "@/lib/classic-banner/classic-banner-update";
import type {
  ClassicBannerProjectData,
  ClassicBannerSizeVariant,
} from "@/types/classic-banner";

interface ClassicBannerPreviewProps {
  variant: ClassicBannerSizeVariant;
  data: ClassicBannerProjectData;
  maxWidth?: number;
}

function layerStyle(
  rect: { left: number; top: number; width: number; height: number },
  zIndex: number,
): React.CSSProperties {
  return {
    position: "absolute",
    left: `${rect.left}%`,
    top: `${rect.top}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`,
    overflow: "hidden",
    zIndex,
  };
}

export function ClassicBannerPreview({
  variant,
  data,
  maxWidth = 520,
}: ClassicBannerPreviewProps) {
  const { width, height, family } = variant;
  const { content, designTokens, slots } = data;

  const layout = useMemo(
    () =>
      computeClassicBannerLayout({
        width,
        height,
        family,
        content,
        designTokens,
        slots,
      }),
    [width, height, family, content, designTokens, slots],
  );

  const scale = Math.min(1, maxWidth / width);
  const frameWidth = width * scale;
  const frameHeight = height * scale;

  const showLogo = isClassicBannerSlotVisible(data, "logo") && Boolean(content.logoUrl.trim());
  const showHeadline = isClassicBannerSlotVisible(data, "headline");
  const showSlogan =
    isClassicBannerSlotVisible(data, "slogan") &&
    layout.showSlogan &&
    Boolean(content.slogan.trim());
  const showHero =
    isClassicBannerSlotVisible(data, "hero") && Boolean(content.heroImageUrl.trim());
  const showCta = isClassicBannerSlotVisible(data, "cta") && Boolean(content.ctaText.trim());
  const showBadge =
    isClassicBannerSlotVisible(data, "badge") && Boolean(content.badgeText.trim());

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative overflow-hidden rounded-lg border border-zinc-700/80 bg-zinc-900 shadow-xl"
        style={{ width: frameWidth, height: frameHeight }}
      >
        <div
          className="relative origin-top-left"
          style={{
            width,
            height,
            transform: `scale(${scale})`,
          }}
          role="img"
          aria-label={`Náhled banneru ${width}×${height}`}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: designTokens.primaryColor,
              zIndex: layout.zIndex.background,
            }}
          />
          {content.backgroundUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={content.backgroundUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ zIndex: layout.zIndex.background }}
            />
          ) : null}

          {showHero ? (
            <div
              style={layerStyle(layout.hero, layout.zIndex.hero)}
              className="flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.heroImageUrl}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : null}

          {showHeadline ? (
            <div
              style={{
                ...layerStyle(layout.headline, layout.zIndex.headline),
                color: designTokens.textColor,
                fontFamily: designTokens.fontFamily,
                fontWeight: designTokens.headlineFontWeight,
                fontSize: layout.headlineFontSize,
                lineHeight: 1.15,
                whiteSpace: "pre-line",
                display: "-webkit-box",
                WebkitLineClamp: layout.headlineMaxLines,
                WebkitBoxOrient: "vertical",
              }}
            >
              {content.headline}
            </div>
          ) : null}

          {showSlogan ? (
            <div
              style={{
                ...layerStyle(layout.slogan, layout.zIndex.slogan),
                color: designTokens.textColor,
                fontFamily: designTokens.fontFamily,
                fontWeight: designTokens.bodyFontWeight,
                fontSize: layout.sloganFontSize,
                lineHeight: 1.2,
                opacity: 0.92,
              }}
            >
              {content.slogan}
            </div>
          ) : null}

          {showLogo ? (
            <div
              style={layerStyle(layout.logo, layout.zIndex.logo)}
              className="flex items-start justify-start"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.logoUrl}
                alt="Logo"
                className="max-h-full max-w-full object-contain object-left-top"
                style={{ maxHeight: layout.logoMaxHeight }}
              />
            </div>
          ) : null}

          {showCta ? (
            <div
              style={layerStyle(layout.cta, layout.zIndex.cta)}
              className="flex items-end"
            >
              <span
                className="inline-flex items-center justify-center"
                style={{
                  backgroundColor: designTokens.ctaBackgroundColor,
                  color: designTokens.ctaTextColor,
                  fontFamily: designTokens.fontFamily,
                  fontWeight: designTokens.headlineFontWeight,
                  fontSize: layout.ctaFontSize,
                  borderRadius: designTokens.borderRadius,
                  padding: `${layout.ctaPaddingY}px ${layout.ctaPaddingX}px`,
                  maxWidth: "100%",
                }}
              >
                {content.ctaText}
              </span>
            </div>
          ) : null}

          {showBadge ? (
            <div
              style={layerStyle(layout.badge, layout.zIndex.badge)}
              className="flex items-start justify-end"
            >
              <span
                className="inline-flex items-center justify-center rounded-full font-semibold"
                style={{
                  backgroundColor: designTokens.badgeBackgroundColor,
                  color: designTokens.badgeTextColor,
                  fontSize: layout.badgeFontSize,
                  padding: "2px 8px",
                  minWidth: layout.badgeFontSize * 2,
                }}
              >
                {content.badgeText}
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <p className="font-mono text-sm text-zinc-400">
        {width}×{height} · {Math.round(scale * 100)}%
      </p>
    </div>
  );
}
