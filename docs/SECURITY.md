# Security

Bezpečnostní zásady pro Sklik HTML5 Banner Generator.

---

## Env proměnné a secrets

| Proměnná | Kde použít | Nikdy |
|----------|-----------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only | Client, git, logs |
| `BLOB_READ_WRITE_TOKEN` | Server-side only | Client, git, logs |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | — |

- Secrets pouze v `.env.local` (gitignored)
- Nikdy necommitovat `.env`, `.env.local`, credentials
- V produkci nastavit přes Vercel Environment Variables

---

## Supabase

- Všechny DB operace přes server-side klient (Route Handlers, Server Actions)
- Service role key **nikdy** na klienta
- RLS policies: minimální přístup, service role pro interní app
- Parametrizované dotazy — žádný raw SQL s user inputem

---

## Upload souborů

### Povolené typy

`gif`, `png`, `jpg`, `jpeg`, `svg`, `webp`, `avif`

### Limity

- Max velikost uploadu: 500 kB na soubor (banner limit je 250 kB celkem)
- Validace MIME typu na serveru (ne jen přípona)
- Sanitizace názvu souboru (odstranit path traversal, speciální znaky)

### Storage

- Assety ukládat pod `assets/{projectId}/{sanitized-filename}`
- Při smazání projektu smazat všechny soubory z Blob

---

## Generovaný HTML/CSS/JS

- Escapovat user input v generovaném HTML (headline, subheadline, CTA)
- Žádné `eval()`, `innerHTML` s neescapovaným obsahem
- Zakázané funkce dle Sklik spec: `window.open()`, `Enabler.exit()`, `mraid.open()`
- Externí zdroje pouze z whitelistu (viz `docs/SKLIK_HTML5_SPEC.md`)

---

## API routes

- Validovat všechny vstupy (params, body)
- Rate limiting na upload a export endpointy (implementovat ve fázi deploy)
- Vracet generické error messages klientovi, detaily logovat server-side
- Autentizace: interní app — v MVP bez veřejné registrace, ochrana přes Vercel deployment protection nebo IP whitelist

---

## Preview link

- `share_id` musí být unikátní a nepředvídatelné (nanoid/uuid)
- Preview je read-only — žádné editační operace
- Po smazání projektu preview vrací 404

---

## Retence a cleanup

- Exportované projekty: automatické smazání po 30 dnech
- Při smazání: cascade delete DB záznamů + Blob souborů
- Cron job pro cleanup expirovaných projektů

---

## Checklist pro nový kód

- [ ] Secrets pouze server-side
- [ ] User input escapován v generovaném HTML
- [ ] Upload validace (typ, velikost, název)
- [ ] API vstupy validovány
- [ ] Žádné secrets v logu nebo error response
