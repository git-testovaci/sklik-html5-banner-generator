# Rozhodnutí (Architecture Decision Records)

Formát: `[DATUM] DEC-XXX — Název`

---

## [2026-06-22] DEC-001 — Samostatný repozitář

**Kontext:** Potřeba interního nástroje pro tvorbu Sklik HTML5 bannerů.

**Rozhodnutí:** Nový samostatný repozitář `sklik-html5-banner-generator`, ne monorepo ani rozšíření existující aplikace.

**Důvod:** Izolace scope, nezávislý deploy, jednoduchá údržba.

---

## [2026-06-22] DEC-002 — Next.js + TypeScript + Tailwind CSS

**Kontext:** Výběr frontend stacku pro interní webovou aplikaci.

**Rozhodnutí:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4.

**Důvod:** Tým zná stack, SSR/SSG pro dashboard, API routes pro backend logiku, Tailwind pro rychlé UI.

**Alternativy zvažované:** Vite + React (bez SSR), plain HTML (bez editoru).

---

## [2026-06-22] DEC-003 — Supabase pro databázi

**Kontext:** Potřeba persistentního úložiště pro projekty, assety a exporty.

**Rozhodnutí:** Supabase (PostgreSQL) s migracemi.

**Důvod:** Managed Postgres, jednoduché API, RLS pro budoucí rozšíření.

**Alternativy zvažované:** Vercel Postgres, SQLite (nevhodné pro produkci).

---

## [2026-06-22] DEC-004 — Vercel Blob pro soubory

**Kontext:** Upload obrázků a export ZIP souborů.

**Rozhodnutí:** Vercel Blob storage.

**Důvod:** Nativní integrace s Vercel deployem, jednoduché API, CDN.

**Alternativy zvažované:** Supabase Storage, S3.

---

## [2026-06-22] DEC-005 — Validátor před exportem

**Kontext:** Sklik má striktní pravidla pro HTML5 bannery.

**Rozhodnutí:** Vlastní validátor běžící před exportem. Export povolen pouze při PASS (nebo s explicitním varováním).

**Důvod:** Prevence zamítnutých bannerů, okamžitá zpětná vazba v editoru.

---

## [2026-06-22] DEC-006 — Žádný commit/push přes Cursor Agent

**Kontext:** Cursor Agent implementuje kód po fázích.

**Rozhodnutí:** Agent nedělá git commit ani push. Commit provede vývojář manuálně po review.

**Důvod:** Kontrola nad historií, review před merge.

---

## Šablona pro nová rozhodnutí

```markdown
## [DATUM] DEC-XXX — Název

**Kontext:** Proč řešíme tento problém.

**Rozhodnutí:** Co jsme se rozhodli udělat.

**Důvod:** Proč tato volba.

**Alternativy zvažované:** Co jsme nevybrali a proč.
```
