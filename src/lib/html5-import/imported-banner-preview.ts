const MIME: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  avif: "image/avif",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  eot: "application/vnd.ms-fontobject",
};

function ext(path: string): string {
  return path.split(".").pop()?.toLowerCase() ?? "";
}

function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(0, i) : "";
}

function resolvePath(baseDir: string, ref: string): string {
  if (ref.startsWith("data:") || ref.startsWith("http") || ref.startsWith("//")) {
    return ref;
  }
  const clean = ref.split("?")[0].split("#")[0];
  if (clean.startsWith("/")) {
    return clean.slice(1).replace(/^\.\//, "");
  }
  const parts = `${baseDir}/${clean}`.split("/");
  const stack: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return stack.join("/");
}

export interface PreviewBuildResult {
  html: string;
  blobUrls: string[];
  unresolved: string[];
  resolutionRate: number;
}

export function buildSandboxPreview(
  htmlPath: string,
  htmlContent: string,
  files: Map<string, Uint8Array>,
): PreviewBuildResult {
  const blobUrls: string[] = [];
  const blobMap = new Map<string, string>();
  const baseDir = dirname(htmlPath);

  for (const [path, data] of files) {
    if (path === htmlPath) continue;
    const mime = MIME[ext(path)] ?? "application/octet-stream";
    const copy = Uint8Array.from(data);
    const blob = new Blob([copy], { type: mime });
    const url = URL.createObjectURL(blob);
    blobUrls.push(url);
    blobMap.set(path, url);
    blobMap.set(path.toLowerCase(), url);
  }

  const unresolved: string[] = [];

  function replaceRef(ref: string): string {
    if (!ref || ref.startsWith("data:") || ref.startsWith("http") || ref.startsWith("//")) {
      return ref;
    }
    const resolved = resolvePath(baseDir, ref);
    const url = blobMap.get(resolved) ?? blobMap.get(resolved.toLowerCase());
    if (url) return url;
    unresolved.push(ref);
    return ref;
  }

  let html = htmlContent;
  html = html.replace(
    /(<(?:link|script|img|source)[^>]+(?:href|src)=["'])([^"']+)(["'])/gi,
    (_m, pre, ref, post) => `${pre}${replaceRef(ref)}${post}`,
  );
  html = html.replace(
    /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi,
    (_m, ref) => `url(${replaceRef(ref.trim())})`,
  );

  const totalRefs =
    (htmlContent.match(/(?:href|src)=["'][^"']+["']/gi) ?? []).length +
    (htmlContent.match(/url\(/gi) ?? []).length;
  const resolved = totalRefs > 0 ? Math.max(0, 1 - unresolved.length / totalRefs) : 1;

  return {
    html,
    blobUrls,
    unresolved: [...new Set(unresolved)],
    resolutionRate: Math.round(resolved * 100),
  };
}
