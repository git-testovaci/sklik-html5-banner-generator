import type { BannerAnimation } from "@/types/editor";
import type { AnimationInsights } from "@/types/imported-banner";

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function analyzeAnimations(
  cssContents: string[],
  jsContents: string[],
): AnimationInsights {
  const css = cssContents.join("\n");
  const js = jsContents.join("\n");

  const keyframeNames = uniq(
    [...css.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)/g)].map((m) => m[1]),
  );
  const animationNames = uniq(
    [...css.matchAll(/animation(?:-name)?:\s*([^;}{]+)/gi)].flatMap((m) =>
      m[1].split(",").map((v) => v.trim().split(/\s+/)[0]),
    ),
  );
  const durations = uniq(
    [...css.matchAll(/animation-duration:\s*([^;}{]+)/gi)].map((m) => m[1].trim()),
  );

  const hasTransitions = /transition\s*:/i.test(css);
  const hasRequestAnimationFrame = /requestAnimationFrame\s*\(/i.test(js);
  const hasTimers = /set(?:Timeout|Interval)\s*\(/i.test(js);
  const hasClassListManipulation =
    /classList\.(?:add|remove|toggle)\s*\(/i.test(js);

  const timelineHints: string[] = [];
  if (keyframeNames.length) timelineHints.push(`${keyframeNames.length} keyframe(s)`);
  if (hasTransitions) timelineHints.push("CSS transitions");
  if (hasRequestAnimationFrame) timelineHints.push("requestAnimationFrame");
  if (hasTimers) timelineHints.push("Timer-based motion");

  let score = keyframeNames.length + animationNames.length;
  if (hasTransitions) score += 1;
  if (hasRequestAnimationFrame) score += 2;
  if (hasTimers) score += 1;
  if (hasClassListManipulation) score += 1;

  const complexity =
    score >= 5 ? "high" : score >= 2 ? "medium" : "low";

  let recreateCapability: AnimationInsights["recreateCapability"] = "yes";
  if (complexity === "high" || hasRequestAnimationFrame) recreateCapability = "no";
  else if (complexity === "medium") recreateCapability = "partial";

  const combined = [...keyframeNames, ...animationNames].join(" ").toLowerCase();
  let suggestedAnimation: BannerAnimation = "none";
  if (combined.includes("pulse")) suggestedAnimation = "soft-pulse";
  else if (combined.includes("slide")) suggestedAnimation = "slide-up";
  else if (combined.includes("fade") || hasTransitions) suggestedAnimation = "fade-in";
  else if (complexity !== "low") suggestedAnimation = "slide-up";

  const inspirationNotes: string[] = [];
  if (keyframeNames.length) {
    inspirationNotes.push(`Keyframes: ${keyframeNames.slice(0, 4).join(", ")}`);
  }
  if (durations.length) {
    inspirationNotes.push(`Durations: ${durations.slice(0, 3).join(", ")}`);
  }
  if (!inspirationNotes.length) {
    inspirationNotes.push("No strong animation patterns detected");
  }

  return {
    keyframeNames,
    animationNames,
    durations,
    hasTransitions,
    hasRequestAnimationFrame,
    hasTimers,
    hasClassListManipulation,
    timelineHints,
    complexity,
    recreateCapability,
    suggestedAnimation,
    inspirationNotes,
  };
}
