import { NextResponse } from "next/server";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_PREFIX = "image/";
const REJECTED_CONTENT_TYPES = new Set([
  "image/svg+xml",
  "image/svg",
  "text/html",
  "text/javascript",
  "application/javascript",
  "application/json",
]);

function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "127.0.0.1" || host === "::1" || host === "0.0.0.0") return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const octets = ipv4.slice(1).map((part) => Number(part));
  if (octets.some((value) => !Number.isFinite(value) || value < 0 || value > 255)) {
    return true;
  }

  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;

  return false;
}

function validateImportUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("Neplatná URL adresa.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Povoleny jsou pouze http a https URL.");
  }

  if (isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error("Tato URL adresa není povolena.");
  }

  return parsed;
}

function filenameFromUrl(url: URL, contentType: string): string {
  const lastSegment = url.pathname.split("/").filter(Boolean).pop() ?? "imported-image";
  const safeName = lastSegment.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
  if (/\.[a-z0-9]{2,5}$/i.test(safeName)) {
    return safeName;
  }

  const extByType: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  const ext = extByType[contentType] ?? "img";
  return `${safeName}.${ext}`;
}

function validateContentType(contentType: string): string {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!normalized.startsWith(ALLOWED_IMAGE_PREFIX)) {
    throw new Error("Odpověď není obrázek.");
  }
  if (REJECTED_CONTENT_TYPES.has(normalized)) {
    throw new Error("Tento typ obrázku nelze importovat.");
  }
  if (normalized.startsWith("video/") || normalized.startsWith("text/")) {
    throw new Error("Tento typ souboru nelze importovat.");
  }
  return normalized;
}

async function readResponseWithLimit(response: Response): Promise<ArrayBuffer> {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const length = Number(contentLength);
    if (Number.isFinite(length) && length > MAX_IMPORT_BYTES) {
      throw new Error("Obrázek je větší než 5 MB.");
    }
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMPORT_BYTES) {
      throw new Error("Obrázek je větší než 5 MB.");
    }
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_IMPORT_BYTES) {
      throw new Error("Obrázek je větší než 5 MB.");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json({ error: "Chybí URL." }, { status: 400 });
    }

    const targetUrl = validateImportUrl(body.url);
    const upstream = await fetch(targetUrl.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Obrázek se nepodařilo stáhnout ze vzdáleného serveru." },
        { status: 502 },
      );
    }

    const finalUrl = new URL(upstream.url);
    if (isPrivateOrLocalHost(finalUrl.hostname)) {
      return NextResponse.json({ error: "Přesměrování na nepovolenou adresu." }, { status: 400 });
    }

    const contentType = validateContentType(
      upstream.headers.get("content-type") ?? "application/octet-stream",
    );

    const buffer = await readResponseWithLimit(upstream);
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: "Stažený soubor je prázdný." }, { status: 400 });
    }

    const fileName = filenameFromUrl(targetUrl, contentType);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "x-image-content-type": contentType,
        "x-image-filename": fileName,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import obrázku se nepovedl.";
    const status = message.includes("5 MB") ? 413 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
