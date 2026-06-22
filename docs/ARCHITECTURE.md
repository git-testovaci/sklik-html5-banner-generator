# Architektura

## Přehled systému

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│  Next.js App │────▶│   Supabase   │
│  (React UI)  │◀────│  (Vercel)    │◀────│  (Postgres)  │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────▼───────┐
                     │ Vercel Blob  │
                     │ (assety, ZIP)│
                     └──────────────┘
```

## Adresářová struktura (cílová)

```
src/
├── app/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── editor/
│   │   └── [id]/
│   │       └── page.tsx
│   ├── preview/
│   │   └── [shareId]/
│   │       └── page.tsx
│   └── api/
│       ├── projects/
│       ├── assets/
│       ├── export/
│       └── validate/
├── components/
│   ├── dashboard/
│   ├── editor/
│   ├── preview/
│   └── ui/
├── lib/
│   ├── supabase/
│   ├── blob/
│   ├── validator/
│   ├── zip/
│   └── banner-template/
└── types/
    └── index.ts
```

> Aktuální stav: bootstrapped Next.js v `src/app/`. Struktura výše se vytváří postupně dle roadmapy.

## Vrstvy aplikace

### 1. Prezentační vrstva (React)

- Server Components pro načtení dat (dashboard, preview)
- Client Components pro interaktivní editor a živý náhled
- Tailwind CSS pro styling

### 2. API vrstva (Next.js Route Handlers)

| Endpoint | Metoda | Účel |
|----------|--------|------|
| `/api/projects` | GET, POST | Seznam, vytvoření |
| `/api/projects/[id]` | GET, PATCH, DELETE | Detail, update, smazání |
| `/api/assets` | POST | Upload obrázku |
| `/api/assets/[id]` | DELETE | Smazání assetu |
| `/api/export/[id]` | POST | Generování ZIP |
| `/api/validate/[id]` | POST | Spuštění validace |

### 3. Datová vrstva (Supabase)

- PostgreSQL tabulky: `projects`, `assets`, `exports`
- Row Level Security — interní app, přístup přes service role na serveru
- Migrace v `supabase/migrations/`

### 4. Storage vrstva (Vercel Blob)

- Assety projektů: `assets/{projectId}/{filename}`
- Exportované ZIP: `exports/{projectId}/{timestamp}.zip`
- Veřejné URL pro preview, privátní pro interní operace

## Klíčové moduly

### `lib/banner-template/`

Generuje HTML, CSS a JS z dat projektu. Vstup: objekt projektu + assety. Výstup: soubory pro ZIP.

### `lib/zip/`

Sestaví ZIP pomocí JSZip. Kontroluje velikost a strukturu před uložením.

### `lib/validator/`

Validuje ZIP dle `docs/SKLIK_HTML5_SPEC.md`. Vrací `{ status: 'pass' | 'fail', errors: string[] }`.

### `lib/supabase/`

Klient pro server-side operace. Nikdy neexponovat service role key na klienta.

## Tok dat — vytvoření a export

```
1. POST /api/projects        → insert do Supabase
2. PATCH /api/projects/[id] → update polí editoru
3. POST /api/assets         → upload do Blob + insert do DB
4. POST /api/validate/[id]  → generuj ZIP in-memory → validuj
5. POST /api/export/[id]    → generuj ZIP → ulož do Blob → insert exports
6. DELETE /api/projects/[id] → smaž assety z Blob → cascade delete DB
```

## Preview link

- Každý projekt má `share_id` (nanoid nebo uuid)
- Route `/preview/[shareId]` načte projekt dle `share_id`
- Po smazání projektu route vrátí 404

## Retence a cleanup

- Cron job (Vercel Cron) denně: najdi projekty kde `expires_at < now()`
- Pro každý: smaž Blob assety, Blob exporty, DB záznamy

## Env proměnné

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BLOB_READ_WRITE_TOKEN=
```

## Deployment

- Vercel — automatický deploy z main větve
- Supabase — managed Postgres
- Vercel Blob — soubory v rámci Vercel projektu

## Bezpečnost

Detail viz `docs/SECURITY.md`. Zásady:

- Service role key pouze na serveru
- Validace uploadů (typ, velikost)
- Sanitizace generovaného HTML
- Whitelist externích domén ve validátoru
