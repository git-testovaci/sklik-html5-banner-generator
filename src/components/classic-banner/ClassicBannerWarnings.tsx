"use client";

import type { ClassicBannerRecommendation } from "@/lib/classic-banner/classic-banner-recommendations";

interface ClassicBannerWarningsProps {
  recommendations: ClassicBannerRecommendation[];
  className?: string;
}

export function ClassicBannerWarnings({
  recommendations,
  className = "",
}: ClassicBannerWarningsProps) {
  if (recommendations.length === 0) return null;

  return (
    <ul
      className={`space-y-1.5 ${className}`}
      aria-label="Doporučení pro banner"
    >
      {recommendations.map((item) => (
        <li
          key={item.id}
          className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${
            item.severity === "warning"
              ? "border-amber-800/50 bg-amber-950/30 text-amber-200"
              : "border-zinc-700/60 bg-zinc-900/50 text-zinc-400"
          }`}
        >
          {item.message}
        </li>
      ))}
    </ul>
  );
}
