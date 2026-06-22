const FORBIDDEN_JS: { pattern: RegExp; label: string }[] = [
  { pattern: /window\.open\s*\(/i, label: "window.open()" },
  { pattern: /Enabler\.exit\s*\(/i, label: "Enabler.exit()" },
  { pattern: /mraid\.open\s*\(/i, label: "mraid.open()" },
];

const VIDEO_EXT = new Set(["mp4", "webm", "mov", "avi"]);
const EXTERNAL_PATTERN = /(?:https?:\/\/|\/\/)[^\s"'`)>]+/gi;

export function detectForbiddenJs(contents: string[]): {
  found: boolean;
  matches: string[];
} {
  const matches = new Set<string>();
  for (const text of contents) {
    for (const { pattern, label } of FORBIDDEN_JS) {
      if (pattern.test(text)) matches.add(label);
    }
  }
  return { found: matches.size > 0, matches: [...matches] };
}

export function extractExternalSources(contents: string[]): string[] {
  const sources = new Set<string>();
  for (const text of contents) {
    for (const match of text.match(EXTERNAL_PATTERN) ?? []) {
      sources.add(match.replace(/[),;'"]+$/, ""));
    }
  }
  return [...sources];
}

export function classifyExternal(url: string): "fail" | "warn" {
  if (url.startsWith("http://") || url.startsWith("//")) return "fail";
  if (url.startsWith("https://")) return "warn";
  return "warn";
}

export function isVideoPath(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXT.has(ext);
}

export function isNestedZipPath(path: string): boolean {
  return path.toLowerCase().endsWith(".zip");
}
