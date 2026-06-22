# Validation Rules

Implementační specifikace Sklik validátoru. Referenční spec: `docs/SKLIK_HTML5_SPEC.md`.

---

## Vstup validátoru

```typescript
interface ValidationInput {
  zipBuffer: Buffer;       // ZIP soubor in-memory
  projectWidth: number;
  projectHeight: number;
}
```

## Výstup validátoru

```typescript
interface ValidationResult {
  status: 'pass' | 'fail';
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: {
    totalSize: number;     // bytes
    fileCount: number;
    htmlFileCount: number;
  };
}

interface ValidationError {
  code: string;
  message: string;
  file?: string;
}
```

---

## Pravidla (v pořadí kontroly)

### V001 — Jeden HTML soubor

- ZIP musí obsahovat právě **1** soubor s příponou `.html` nebo `.htm`
- FAIL pokud 0 nebo > 1

### V002 — Žádné vnořené ZIP

- ZIP nesmí obsahovat soubory s příponou `.zip`
- FAIL pokud nalezen

### V003 — Celková velikost

- Celková velikost rozbaleného obsahu ≤ **250 kB** (256 000 bytes)
- FAIL pokud překročeno

### V004 — Počet souborů

- Max **40** souborů v ZIP
- FAIL pokud překročeno

### V005 — Hloubka adresářů

- Max **2** úrovně podsložek (např. `assets/image.webp` = OK, `assets/sub/img.webp` = FAIL)
- FAIL pokud překročeno

### V006 — Povolené typy souborů

Povolené přípony:

```
html, htm, css, js, gif, png, jpg, jpeg, svg,
woff, woff2, ttf, eot, json, txt, xml, webp, avif
```

- FAIL pro každý soubor s nepovolenou příponou

### V007 — Meta tag ad.size

- HTML musí obsahovat: `<meta name="ad.size" content="width=X,height=Y">`
- Hodnoty X a Y musí odpovídat `projectWidth` a `projectHeight`
- FAIL pokud chybí nebo nesedí

### V008 — Zakázané HTML prvky

Detekovat v HTML souborech:

| Prvek | Důvod |
|-------|-------|
| `<form>` | Sklik zákaz formulářů |
| `<video>`, `<audio>` | Sklik zákaz videa |
| `<iframe>` | Potenciálně expanzivní |
| `<input>`, `<select>`, `<textarea>`, `<button type="submit">` | Formulářové prvky |

### V009 — Zakázané JS funkce

Detekovat v `.js` souborech a inline `<script>` blocích:

- `window.open(`
- `Enabler.exit(`
- `mraid.open(`

Case-insensitive kontrola.

### V010 — Externí zdroje

- Všechny externí URL (v `src`, `href`, CSS `@import`, CSS `url()`) musí:
  1. Používat `https://`
  2. Doména musí být na whitelistu

Whitelist (základní):

```
fonts.googleapis.com
fonts.gstatic.com
cdnjs.cloudflare.com
```

- Relativní cesty (bez protokolu) = OK
- Data URI = OK pro malé assety

### V011 — Zakázané vzory chování

Detekovat klíčová slova/vzory indikující:

- Carousel: `carousel`, `slider`, `swiper`, `slick`
- Expanzivní: `expand`, `mouseover.*resize`, `onmouseover.*width`
- Kalkulačka: `<input type="number">` s event listenery

> Implementovat jako heuristiku — false positives řešit ve fázi polish.

### V012 — Cílová URL v HTML

- Banner **nesmí** obsahovat `<a href="http...">` s externí cílovou URL
- Sklik URL bere z nastavení reklamy
- WARN pokud nalezeno `<a href="http`

---

## PASS/FAIL logika

```
PASS = 0 errors (warnings povoleny)
FAIL = 1+ errors
```

Export ZIP:

- PASS → export povolen
- FAIL → export blokován, zobrazit seznam chyb

---

## UI zobrazení (pravý panel editoru)

### PASS stav

```
✅ Validace úspěšná
Velikost: 142 kB / 250 kB
Souborů: 5 / 40
[Tlačítko: Exportovat ZIP]
```

### FAIL stav

```
❌ Validace selhala (3 chyby)
• V003: Celková velikost 280 kB překračuje limit 250 kB
• V009: Nalezen window.open() v script.js
• V007: Chybí meta tag ad.size
[Tlačítko: Exportovat ZIP — disabled]
```

---

## Implementační poznámky

- Validátor běží server-side v `/api/validate/[id]`
- ZIP se generuje in-memory (JSZip), neukládá se do Blob
- Výsledek se ukládá do `exports.validation_status`
- Validátor je pure function v `lib/validator/` — testovatelný bez DB
