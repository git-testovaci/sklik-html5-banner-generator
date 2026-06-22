const CTA_HINTS = [
  "buy", "shop", "learn", "discover", "download", "register", "get", "try",
  "start", "view", "nakup", "zjistit", "stáhnout", "objednat",
];

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1]?.trim() || null;
}

export function extractAdSize(html: string): { width: number; height: number } | null {
  const patterns = [
    /name=["']ad\.size["'][^>]+content=["']width=(\d+),height=(\d+)["']/i,
    /content=["']width=(\d+),height=(\d+)["'][^>]+name=["']ad\.size["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return { width: Number(m[1]), height: Number(m[2]) };
  }
  return null;
}

export function inferSizeFromCss(cssList: string[]): { width: number; height: number } | null {
  for (const css of cssList) {
    const m = css.match(/width:\s*(\d+)px[^}]*height:\s*(\d+)px/i);
    if (m) return { width: Number(m[1]), height: Number(m[2]) };
  }
  return null;
}

export function extractCta(html: string, plain: string): string | null {
  const btn = html.match(/<button[^>]*>([\s\S]*?)<\/button>/i);
  if (btn) {
    const t = stripHtml(btn[1]);
    if (t) return t;
  }
  const link = html.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
  if (link) {
    const t = stripHtml(link[1]);
    if (t && t.length <= 30) return t;
  }
  const lower = plain.toLowerCase();
  for (const hint of CTA_HINTS) {
    const i = lower.indexOf(hint);
    if (i >= 0) return plain.slice(i, i + 24).trim();
  }
  return null;
}

export function extractHeadlines(plain: string): {
  headline: string | null;
  subheadline: string | null;
} {
  const parts = plain.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    const words = plain.split(/\s+/).filter(Boolean);
    return {
      headline: words.slice(0, 8).join(" ") || null,
      subheadline: words.slice(8, 16).join(" ") || null,
    };
  }
  return { headline: parts[0] ?? null, subheadline: parts[1] ?? null };
}
