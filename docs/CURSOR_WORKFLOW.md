# Cursor Workflow

Pravidla pro Cursor Agent při implementaci tohoto projektu.

---

## Základní pravidla

1. **Malé přesné úkoly** — jedna fáze / jedna feature najednou
2. **Nepoužívat `/multitask`** — sekvenční implementace
3. **Nepřidávat závislosti** bez explicitního povolení
4. **Neměnit `package.json`** bez explicitního povolení
5. **Nedělat commit ani push** — vývojář commitne manuálně
6. **Po implementaci spustit:**
   ```bash
   npm run lint
   npm run build
   ```
7. **Krátký report** — viz formát níže

---

## Čtení dokumentace

| Fáze | Co číst |
|------|---------|
| Fáze 1 | Všechny docs (jednorázově) |
| Fáze 2+ | Pouze relevantní doc + `.cursor/rules/` |

Agent **nemusí** při každém úkolu číst celou dokumentaci. Stačí:

- Příslušné pravidlo z `.cursor/rules/`
- Konkrétní doc dle úkolu (např. `SKLIK_HTML5_SPEC.md` pro validátor)

---

## Formát reportu po implementaci

```
A) Změněné/vytvořené soubory
B) Potvrzení, že package.json a package-lock.json nebyly změněny
C) Výsledek npm run lint
D) Výsledek npm run build
E) Rizika (max 3 body)
F) Doporučený commit message
```

---

## Workflow jednoho úkolu

```
1. Přečti relevantní .cursor/rules/*.mdc
2. Přečti relevantní docs/*.md (pokud potřeba)
3. Implementuj minimální diff
4. npm run lint && npm run build
5. Napiš krátký report (A–F)
6. Necommituj, nepushuj
```

---

## Zakázané akce

- `git commit`, `git push`
- Úprava `package.json`, `package-lock.json` bez povolení
- Instalace npm balíčků bez povolení
- Změna kódu mimo scope aktuální fáze
- Použití `/multitask`

---

## Povolené akce

- Vytváření/editace souborů v rámci scope fáze
- Spouštění `npm run lint`, `npm run build`, `npm run dev`
- Čtení existujícího kódu a docs
- Vytváření nových komponent, API routes, lib modulů

---

## Odkazy

- Architektura: `docs/ARCHITECTURE.md`
- Požadavky: `docs/PRODUCT_REQUIREMENTS.md`
- Roadmap: `docs/ROADMAP.md`
- Rozhodnutí: `docs/DECISIONS.md`
