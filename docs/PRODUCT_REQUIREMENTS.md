# Product Requirements — MVP

## Přehled

MVP umožní internímu týmu vytvořit HTML5 banner pro Sklik od šablony po export ZIP s validací.

---

## 1. Dashboard (`/dashboard`)

### Funkce

- Zobrazit seznam projektů (název, rozměr, status, datum)
- Vytvořit nový projekt (název + výběr rozměru)
- Otevřít existující projekt v editoru
- Smazat draft projekt

### Akceptační kritéria

- [ ] Nový projekt se vytvoří s výchozí šablonou a stavem `draft`
- [ ] Seznam se načte z Supabase
- [ ] Smazání draftu odstraní projekt, assety a deaktivuje preview link

---

## 2. Editor (`/editor/[id]`)

### Layout

```
┌─────────────┬──────────────────┬─────────────┐
│  Nastavení  │   Živý náhled    │ Validace /  │
│  (levý)     │   (střed)        │ Export      │
│             │                  │ (pravý)     │
└─────────────┴──────────────────┴─────────────┘
```

### Levý panel — nastavení

- Název projektu
- Rozměr (width × height) — výběr z doporučených
- Headline, subheadline, CTA text
- Barvy (primární, sekundární, pozadí, text)
- Animace (typ, trvání)
- Upload obrázků (logo, pozadí, další assety)

### Střed — živý náhled

- Iframe nebo ekvivalent s aktuálním stavem banneru
- Okamžitá aktualizace při změně nastavení
- Zobrazení ve správném rozměru (škálování pro velké formáty)

### Pravý panel — validace a export

- Spustit validaci
- Zobrazit PASS/FAIL s detaily chyb
- Exportovat ZIP (pouze pokud PASS, nebo s varováním)
- Zkopírovat preview link

### Akceptační kritéria

- [ ] Změna libovolného pole se okamžitě projeví v náhledu
- [ ] Upload obrázku uloží asset do Vercel Blob a propíše URL do projektu
- [ ] Validátor vrátí PASS nebo seznam konkrétních chyb
- [ ] Export vytvoří ZIP dle `docs/SKLIK_HTML5_SPEC.md`
- [ ] Preview link je unikátní a sdílitelný

---

## 3. Preview (`/preview/[shareId]`)

### Funkce

- Read-only zobrazení banneru
- Bez editačních prvků
- 404 pokud projekt neexistuje nebo byl smazán

### Akceptační kritéria

- [ ] Náhled odpovídá aktuálnímu stavu projektu v době načtení
- [ ] Smazaný projekt vrátí chybovou stránku

---

## 4. Validátor

Viz `docs/VALIDATION_RULES.md` a `docs/SKLIK_HTML5_SPEC.md`.

### Akceptační kritéria

- [ ] Kontrola velikosti ZIP (max 250 kB na banner)
- [ ] Kontrola struktury ZIP (1 HTML, max 40 souborů, max 2 úrovně zanoření)
- [ ] Kontrola zakázaných prvků (formuláře, video, carousel, expanzivní chování)
- [ ] Kontrola zakázaných JS funkcí (`window.open`, `Enabler.exit`, `mraid.open`)
- [ ] Kontrola povolených typů souborů
- [ ] Kontrola externích HTTPS zdrojů dle whitelistu
- [ ] Výstup: `validation_status` = `pass` | `fail` + seznam chyb

---

## 5. Export ZIP

### Struktura výstupu

```
banner.zip
├── index.html
├── style.css
├── script.js
└── assets/
    ├── image.webp
    └── logo.webp
```

### HTML požadavky

```html
<meta name="ad.size" content="width=300,height=250">
```

Rozměr se generuje dynamicky dle projektu.

### Akceptační kritéria

- [ ] ZIP obsahuje přesně jeden HTML soubor
- [ ] ZIP neobsahuje vnořené ZIP soubory
- [ ] Velikost ≤ 250 kB
- [ ] Export se uloží do Vercel Blob a záznam do tabulky `exports`

---

## 6. Mazání a retence

| Typ | Chování |
|-----|---------|
| Draft | Ruční mazání uživatelem z dashboardu |
| Exportovaný | Automatické smazání po 30 dnech (`expires_at`) |
| Assety | Cascade delete s projektem (Blob + DB) |
| Preview link | Deaktivace po smazání projektu |

### Akceptační kritéria

- [ ] Mazání projektu smaže assety z Blob storage
- [ ] Mazání projektu smaže záznamy z DB
- [ ] Cron/scheduled job maže expirované projekty

---

## Datový model

### `projects`

| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | uuid | PK |
| name | text | Název projektu |
| status | enum | `draft` \| `exported` |
| width | int | Šířka v px |
| height | int | Výška v px |
| headline | text | Hlavní nadpis |
| subheadline | text | Podnadpis |
| cta | text | CTA text |
| colors | jsonb | Paleta barev |
| animation | jsonb | Nastavení animace |
| share_id | text | Unikátní ID pro preview link |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| expires_at | timestamptz | Null pro draft, +30 dní po exportu |

### `assets`

| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | uuid | PK |
| project_id | uuid | FK → projects |
| file_name | text | |
| file_url | text | Vercel Blob URL |
| file_size | int | Bytes |
| mime_type | text | |
| created_at | timestamptz | |

### `exports`

| Sloupec | Typ | Popis |
|---------|-----|-------|
| id | uuid | PK |
| project_id | uuid | FK → projects |
| zip_url | text | Vercel Blob URL |
| zip_size | int | Bytes |
| validation_status | enum | `pass` \| `fail` |
| created_at | timestamptz | |

---

## Mimo scope MVP

Neimplementovat: registrace, platby, role, schvalování, AI layout, multi-size generování, Google Drive/OAuth, Sklik API.
