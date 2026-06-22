# Project Brief — Sklik HTML5 Banner Generator

## Co to je

Interní webová aplikace pro tým/agenturu. Umožňuje rychle vytvořit HTML5 banner pro Sklik, zkontrolovat ho validátorem a exportovat jako ZIP připravený k nahrání.

## Pro koho

Interní uživatelé (designéři, account manažeři) — bez veřejné registrace.

## Hlavní tok

```
Šablona → Editace → Kontrola → Náhled → Export ZIP → Smazání
```

## Stack

| Vrstva | Technologie |
|--------|-------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Hosting | Vercel |
| Databáze | Supabase (PostgreSQL) |
| Soubory | Vercel Blob |
| ZIP | JSZip |
| Validace | Vlastní validátor dle Sklik HTML5 specifikace |

## MVP stránky

| Route | Účel |
|-------|------|
| `/dashboard` | Seznam projektů, vytvoření nového |
| `/editor/[id]` | Editor banneru s náhledem a validací |
| `/preview/[shareId]` | Sdílený read-only náhled |

## MVP funkce

- Dashboard projektů
- Editor banneru (text, barvy, animace, rozměr)
- Upload obrázků
- Živý náhled
- Sdílený preview link
- Export ZIP
- Sklik validátor (PASS/FAIL)
- Mazání projektů

## Mimo scope MVP

- Veřejná registrace, platby, týmové role
- Schvalovací workflow
- AI generování layoutu
- Automatické generování všech rozměrů najednou
- Google Drive, Google OAuth
- Přímé Sklik API

## Doporučené rozměry bannerů

300×250, 300×600, 320×100, 728×90, 970×310, 480×300, 480×480, 300×300, 500×200, 160×600

## Retence dat

| Stav | Chování |
|------|---------|
| Draft | Ruční mazání uživatelem |
| Exportovaný | Automatické smazání po 30 dnech |
| Assety | Mazat spolu s projektem |
| Preview link | Deaktivovat po smazání projektu |

## UX principy

- Moderní studio UI
- Levý panel: nastavení banneru
- Střed: živý náhled
- Pravý panel: validace a export
- Jasné PASS/FAIL stavy
- Jednoduché, rychlé, profesionální ovládání

## Repo

`sklik-html5-banner-generator` — samostatný repozitář.

## Odkazy na další dokumenty

- Požadavky: `docs/PRODUCT_REQUIREMENTS.md`
- Architektura: `docs/ARCHITECTURE.md`
- Sklik spec: `docs/SKLIK_HTML5_SPEC.md`
- Validace: `docs/VALIDATION_RULES.md`
- Roadmap: `docs/ROADMAP.md`
- Rozhodnutí: `docs/DECISIONS.md`
- Cursor workflow: `docs/CURSOR_WORKFLOW.md`
