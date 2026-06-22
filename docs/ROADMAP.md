# Roadmap

## Fáze vývoje

| # | Fáze | Popis | Stav |
|---|------|-------|------|
| 1 | Dokumentace + Cursor rules | Project brief, architektura, spec, rules | ✅ |
| 2 | Dashboard UI | Základní layout, seznam projektů, vytvoření | ⬜ |
| 3 | Datový model Supabase | Tabulky, migrace, typy | ⬜ |
| 4 | Upload obrázků | Vercel Blob integrace | ⬜ |
| 5 | Editor banneru | Levý panel nastavení | ⬜ |
| 6 | Živý náhled | Střední panel s iframe preview | ⬜ |
| 7 | Sdílený preview link | `/preview/[shareId]` | ⬜ |
| 8 | Generování ZIP | JSZip, banner template | ⬜ |
| 9 | Sklik validátor | PASS/FAIL dle specifikace | ⬜ |
| 10 | Mazání + cleanup | Ruční i automatické (30 dní) | ⬜ |
| 11 | UX/UI polish | Responzivita, stavy, feedback | ⬜ |
| 12 | Deploy na Vercel | Env, cron, produkční config | ⬜ |

---

## Fáze 1 — Dokumentace (aktuální)

**Výstup:**

- `docs/` — 9 dokumentů
- `.cursor/rules/` — 5 pravidel pro Cursor Agent

**Neměnit:** package.json, package-lock.json, aplikační kód.

---

## Fáze 2 — Dashboard UI

- Route `/dashboard`
- Layout: header, grid projektů, tlačítko „Nový projekt"
- Modal/dialog pro výběr rozměru
- Mock data (bez Supabase)

---

## Fáze 3 — Datový model

- Supabase migrace pro `projects`, `assets`, `exports`
- TypeScript typy v `src/types/`
- Server-side Supabase klient

---

## Fáze 4 — Upload obrázků

- API route pro upload
- Vercel Blob storage
- Náhled nahraných assetů v editoru

---

## Fáze 5 — Editor

- Route `/editor/[id]`
- 3-panel layout (nastavení | náhled | validace)
- Formulářová pole dle datového modelu

---

## Fáze 6 — Živý náhled

- Generování HTML z projektových dat
- Iframe preview s aktualizací při změně

---

## Fáze 7 — Preview link

- Route `/preview/[shareId]`
- Read-only náhled
- Kopírování linku z editoru

---

## Fáze 8 — Export ZIP

- Banner template (HTML + CSS + JS)
- JSZip sestavení
- Uložení do Blob + záznam v `exports`

---

## Fáze 9 — Validátor

- Modul `lib/validator/`
- PASS/FAIL UI v pravém panelu
- Detail chyb

---

## Fáze 10 — Mazání a retence

- Ruční delete z dashboardu
- Cascade delete (Blob + DB)
- Cron job pro 30denní retenci

---

## Fáze 11 — Polish

- Loading stavy, error handling
- Responzivní layout
- Konzistentní design system

---

## Fáze 12 — Deploy

- Vercel projekt, env proměnné
- Supabase produkční instance
- Vercel Cron pro cleanup
