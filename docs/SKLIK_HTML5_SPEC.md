# Sklik HTML5 Specifikace

Referenční dokument pro generování a validaci bannerů. Validátor musí kontrolovat všechna pravidla níže.

---

## Struktura ZIP

### Povinné

- ZIP obsahuje **jeden** HTML soubor (`.html` nebo `.htm`)
- ZIP **nesmí** obsahovat vnořené ZIP soubory

### Limity

| Parametr | Limit |
|----------|-------|
| Velikost jednoho banneru | max 250 kB |
| Velikost ZIP pro hromadné nahrávání | max 2,5 MB |
| Počet souborů v ZIP | max 40 |
| Hloubka zanoření adresářů | max 2 podsložky |

### Povolené typy souborů

`html`, `htm`, `css`, `js`, `gif`, `png`, `jpg`, `jpeg`, `svg`, `woff`, `woff2`, `ttf`, `eot`, `json`, `txt`, `xml`, `webp`, `avif`

---

## Příklad výstupní struktury

```
banner.zip
├── index.html
├── style.css
├── script.js
└── assets/
    ├── image.webp
    └── logo.webp
```

---

## HTML požadavky

### Meta tag rozměru (povinný)

```html
<meta name="ad.size" content="width=300,height=250">
```

Hodnoty `width` a `height` odpovídají rozměru projektu.

### Cílová URL

Sklik bere cílovou URL z **nastavení reklamy**, ne z odkazů uvnitř HTML. Banner tedy **neobsahuje** `<a href="...">` s cílovou URL.

---

## Zakázané prvky a chování

| Kategorie | Zakázáno |
|-----------|----------|
| Formuláře | `<form>`, inputy, submit |
| Kalkulačky | Interaktivní výpočty |
| Carousel | Rotující/slide obsah |
| Expanzivní chování | Rozbalování, hover expand |
| Video | `<video>`, `<iframe>` s videem |

---

## Zakázané JS funkce

Validátor musí detekovat výskyt těchto funkcí v JS souborech i inline skriptech:

- `window.open()`
- `Enabler.exit()`
- `mraid.open()`

---

## Externí zdroje

- Povoleny pouze přes **HTTPS**
- Domény musí být na **whitelistu Skliku**
- Validátor kontroluje všechny `src`, `href`, `@import`, `url()` v CSS a JS

### Whitelist (základní sada — doplnit dle aktuální Sklik dokumentace)

```
fonts.googleapis.com
fonts.gstatic.com
cdnjs.cloudflare.com
```

> Při implementaci validátoru ověřit aktuální whitelist u Skliku a aktualizovat konstantu v `lib/validator/allowed-domains.ts`.

---

## Doporučené rozměry

| Šířka | Výška |
|-------|-------|
| 300 | 250 |
| 300 | 600 |
| 320 | 100 |
| 728 | 90 |
| 970 | 310 |
| 480 | 300 |
| 480 | 480 |
| 300 | 300 |
| 500 | 200 |
| 160 | 600 |

---

## Kontrolní checklist validátoru

1. [ ] ZIP obsahuje právě 1 HTML soubor
2. [ ] ZIP neobsahuje vnořené ZIP
3. [ ] Celková velikost ≤ 250 kB
4. [ ] Počet souborů ≤ 40
5. [ ] Hloubka adresářů ≤ 2
6. [ ] Všechny soubory mají povolenou příponu
7. [ ] HTML obsahuje `<meta name="ad.size" ...>`
8. [ ] Žádné formuláře, video, carousel
9. [ ] Žádné `window.open()`, `Enabler.exit()`, `mraid.open()`
10. [ ] Externí zdroje pouze HTTPS + whitelist
11. [ ] Žádné `<a href>` s cílovou URL (Sklik URL z nastavení reklamy)
