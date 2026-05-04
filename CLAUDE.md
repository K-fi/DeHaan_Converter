# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start Vite dev server
npm run build      # production build
npm run preview    # preview production build
npx tsc --noEmit   # type-check without emitting (no separate lint step)
```

There are no tests.

## Project overview

**De Haan Converter** is a React 18 + Vite + TypeScript SPA built as an internal tool for De Haan. It has two main features accessible from the top navbar:

- **Price Updater** (`/` and `/price-updater`) → `PriceUpdater`
- **Supplier Data Converter** (`/converter`) → `SupplierConverter`

The app helps the company automate two previously manual Excel workflows:
1. Updating product prices in Exact Online using supplier price lists
2. Converting supplier product data from various formats into the single standardized format that Exact Online accepts for importing new products

---

## Architecture

### Routes

| Path | Component | Status |
|------|-----------|--------|
| `/` | `PriceUpdater` | Full feature |
| `/price-updater` | `PriceUpdater` | Full feature |
| `/converter` | `SupplierConverter` | In development |

### Shared infrastructure

**`src/types.ts`** — All cross-component interfaces. Import with `import type` where possible.

Key types:
- `ParsedFile` — output of file parsing (cols, data, raw sheet, header index)
- `BannerInfo` — detection feedback shown in the UI
- `MatchResults` — result of the price matching run
- `ReportRow` — one row in the audit CSV
- `DupeOccurrence` — a single EAN that appeared more than once in the supplier file
- `MatchArgs` — column selections captured before running `computeMatching`
- `AutoDetected` — result of `findBestCol` for each field

**`src/xlsx.ts`** — Raw file I/O. `readFileRaw` handles .xlsx/.xls/.xlsm/.xlsb/.ods via ArrayBuffer and .csv/.tsv/.txt via plain text. Returns an XLSX workbook object. `sheetTo2D` converts a worksheet into a plain 2D string array with no header assumptions.

**`src/headers.ts`** — Smart header detection. `scoreRow` scores a row by keyword overlap with `ALL_HINTS` (union of EAN, price, code, date, and Exact Online column name hints). `detectHeaderRow` scans the first 20 rows and picks the highest-scoring one. `parseFromHeaderRow` builds `{ cols, data }` from a chosen row index, skipping fully empty rows and deduplicating duplicate column names.

**`src/columns.ts`** — Column auto-detection. `findBestCol(cols, data, hints, contentTest?)` first tries name-based matching against hint arrays, then falls back to content scanning (e.g. a column of 13-digit numbers → EAN). Returns the best column name or null.

**`src/matching.ts`** — Price matching logic (Price Updater only). `computeMatching` takes `MatchArgs` + lookup maps and produces `MatchResults`. `normalizeEan` handles scientific notation (e.g. `1.23e13` → `1230000000000`).

**`src/components/FileUploadCard.tsx`** — Shared file upload component used by both features. Owns all file-parsing logic: calls `readFileRaw` → `sheetTo2D` → `detectHeaderRow` + `parseFromHeaderRow`, then fires `onFileLoaded(ParsedFile)`. Renders the upload zone, sheet selector (multi-sheet files), header row override input, detection banner, and paginated column preview (5 columns × 5 rows, with ‹ › navigation — contained in `overflow: hidden` so wide Excel files never stretch the page layout).

---

## Feature 1: Price Updater

### Purpose

Automates updating prices in an Exact Online product export using a supplier price list, matched by EAN (barcode) with article code as fallback.

### User flow (3 steps)

**Step 1 — Upload**
- Upload Exact Online export file (any supported format)
- Upload supplier price list (any supported format)
- Both files go through `FileUploadCard` which auto-detects the header row and shows a paginated preview

**Step 2 — Column mapping**
- Dropdowns for: EAN column, article code column, price column to update (Exact file)
- Dropdowns for: EAN column, article code column, new price column (supplier file)
- Price type toggle: Purchase (inkoopprijs) / Selling (verkoopprijs)
- Optional active from / active to date pickers
- Advanced option to map dates into existing Exact file columns rather than appending new ones
- Auto-detection highlights columns with a green border; uncertain ones with amber

**Step 3 — Results & Download**
- Metrics: prices updated, total rows, unmatched EANs, duplicate EANs
- Summary chips showing price type and any dates applied
- Expandable tables for unmatched products and duplicate EANs
- Paginated preview of the updated output file
- Download updated `.xlsx` (Exact-compatible) and audit report `.csv`

### Performance pattern

Heavy lookup maps (`supplByEan`, `supplByCode`, `allOccurrences`) are stored in `useRef` — they don't trigger re-renders. Only the final `MatchResults` goes into `useState`. `matchArgsRef` caches column selections so `computeMatching` can be called again (e.g. when the user resolves a duplicate) without re-parsing files.

### Matching logic

- Primary: EAN normalized via `normalizeEan` (handles scientific notation)
- Fallback: article code string comparison
- Duplicate EANs in supplier file: surfaced with a per-EAN dropdown; user picks which occurrence's price to use; `reapplyDupeSelections` recomputes without re-parsing

---

## Feature 2: Supplier Data Converter

### Purpose

De Haan receives product data from many different suppliers, each in their own Excel format. The Exact Online database only accepts one standardized column structure for importing new products. This tool converts any supplier file into that format.

### Target output format (Exact Online import columns)

| Column | Method |
|--------|--------|
| `Code` | User provides the last used code number; tool auto-increments from there for each row |
| `Actief vanaf` | Always set to the first day of the current month |
| `Omschrijving` | User selects one or more source columns; values are combined and truncated to 60 characters |
| `Extra omschrijving` | Copy of the full (untruncated) `Omschrijving` source value |
| `Artikelgroep: Omschrijving` | Derived from `Productsoort` — classification logic maps product type to article group |
| `Barcode` | Select from supplier column |
| `Productsoort` | Select from supplier column |
| `Inkoop` | Always `Ja` |
| `Ordergestuurd` | Always `Ja` |
| `Verkoop` | Always `Ja` |
| `Voorraad` | Always `Ja` |
| `Eenheid` | Derived from `Productsoort` — each product type maps to a unit |
| `Btw-code: Verkoop` | Always `2` |
| `Kostprijs` | Select from supplier column |
| `Inkoopeenheid` | Same value as `Eenheid` |
| `Eenheidsfactor` | Always `1` |
| `Bestelnummer leverancier` | Select from supplier column |
| `Verkoopprijs` | Select from supplier column |
| `Hoofdleverancier` | User types a free-text supplier name |
| `Btw-code: Inkoop` | User picks from: Holland = `3`, Europe = `10`, Outside Europe = `9` |
| `Veiligheidsclassificatie` | Select from supplier column |
| `2026 Controle JW` | Always `NG` |
| `Geslacht` | Select from supplier column, or default to `Unisex` |
| `Maat` | Select from supplier column |
| `Merk` | Optional — select from supplier column, or leave empty |
| `KMS Synchronisatie` | Always `Ja` |
| `Kleur` | Select from supplier column |
| `Productnaam` | User selects one or more columns to combine (similar to Omschrijving multi-column combine); intended to form: brand + product type + article type + safety classification code |
| `Artikelcode` | Optional — select from supplier column, or leave empty |
| `Artikelcode Hoofdleverancier zoekveld` | Same value as `Bestelnummer leverancier` |

### User flow (mirrors Price Updater pattern)

**Step 1 — Upload supplier file**
- Single file upload through `FileUploadCard`
- Same smart header detection, sheet selector, header row override, and paginated preview

**Step 2 — Field mapping**
- Column selects for fields sourced from supplier data
- Fixed-value fields are shown as read-only labels (e.g. "Inkoop → always Ja")
- Multi-column combiners for `Omschrijving` and `Productnaam`
- Text input for `Hoofdleverancier`
- Dropdown for `Btw-code: Inkoop` (Holland / Europe / Outside Europe)
- Number input for starting `Code` value (auto-increments per row)
- Optional column selects for `Merk`, `Artikelcode`, `Geslacht`

**Step 3 — Preview & Download**
- Paginated preview of the converted output in the Exact Online column structure
- Download as `.xlsx` ready to import into Exact Online
- Row count summary

### Derivation rules to implement

**`Artikelgroep: Omschrijving`** — derived from `Productsoort` value. The mapping between product types and article groups needs to be defined with the business; implement as a lookup table in a constants file so it can be maintained without touching component logic.

**`Eenheid`** — derived from `Productsoort`. Same pattern: lookup table in constants.

**`Actief vanaf`** — computed at runtime: first day of the current month in `DD-MM-YYYY` format (Exact Online date format).

**`Code`** — user inputs the last used code integer; output column is `lastCode + rowIndex + 1` for each row.

**`Omschrijving` truncation** — combine selected columns with a space separator, then take the first 60 characters. `Extra omschrijving` gets the full combined string before truncation.

**`Artikelcode Hoofdleverancier zoekveld`** — copy directly from whatever column is mapped to `Bestelnummer leverancier`.

---

## Keyword hint arrays (headers.ts / columns.ts)

These drive auto-detection for both features. Extend them when adding new fields:

```ts
EAN_HINTS    // ean, barcode, gtin, ean13, barcodenr, streepjescode …
PRICE_HINTS  // price, prijs, inkoop, verkoop, unitprice, netto …
CODE_HINTS   // article, artikelcode, code, sku, artnr, itemnr …
FROM_HINTS   // activefrom, ingangsdatum, startdate, geldigvan …
TO_HINTS     // activeto, einddatum, enddate, geldigtot …
```

Add Exact Online Dutch column name fragments here so the header scorer can recognize them in files that were previously exported from Exact.

---

## UI conventions

- 3-step wizard pattern for both features (Upload → Map → Results)
- `FileUploadCard` is the single shared upload + preview component — do not duplicate file-parsing logic in feature components
- Paginated column preview: 5 columns × 5 rows, horizontal scroll contained inside the card (`overflow: hidden` on the outer wrapper, `overflow-x: auto` on the scroll container) — never stretches the page
- Auto-detected dropdowns get a green border (`auto-detected` class); uncertain ones get amber (`needs-review`)
- Detection banners use `success` / `warning` / `info` variants
- All fixed-value output fields should be shown to the user as locked/read-only in the mapping UI so they understand what will be written without being able to change it