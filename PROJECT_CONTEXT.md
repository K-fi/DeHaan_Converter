# De Haan Converter — Full Project Context

This document is a complete briefing on the De Haan Converter project: what it is, what it does, how it is built, and the full development history. It is intended to give an AI assistant immediate working context without needing prior conversation history.

---

## 1. What the project is

**De Haan Converter** is an internal web tool built for **De Haan**, a Dutch company that sells workwear and personal protective equipment (PPE). The company uses **Exact Online** as their ERP/product management system.

Before this tool existed, two recurring workflows were done manually in Excel:

1. **Price updates** — suppliers send new price lists; a staff member had to manually find each product in the Exact Online export by EAN barcode, update the price column, and re-import the file.
2. **New product imports** — suppliers send product data in their own Excel formats; a staff member had to reformat every row into Exact Online's fixed import column structure by hand.

This tool automates both workflows entirely. The user uploads files, selects which columns map to which fields, and downloads a ready-to-import Excel file.

---

## 2. Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 15** (App Router) |
| UI | **React 18** + **TypeScript 5** |
| Build | **Next.js** (Vite was original plan, migrated to Next.js for backend/Supabase support) |
| Excel I/O | **SheetJS / xlsx** (`^0.18.5`) |
| Backend/Auth | **Supabase** (`@supabase/supabase-js ^2.49.8`) |
| Deployment | **Vercel** (`vercel.json` present) |
| Styling | Plain CSS (`src/index.css`) — no CSS framework |
| Language | Dutch and English (toggle in UI) |

No test framework. Type-check via `npx tsc --noEmit`.

Run commands:
```
npm run dev      # Next.js dev server
npm run build    # production build
npm run start    # production server
```

---

## 3. Project structure

```
src/
├── app/                     # Next.js App Router
│   ├── layout.tsx           # root layout
│   ├── page.tsx             # / → renders PriceUpdater
│   ├── price-updater/page.tsx
│   ├── converter/page.tsx   # /converter → renders SupplierConverter
│   └── api/health/route.ts  # health-check endpoint
├── components/
│   ├── FileUploadCard.tsx   # shared upload + file parsing component
│   ├── PreviewTable.tsx     # paginated table preview
│   ├── Banner.tsx           # success/warning/info banners
│   ├── Stepper.tsx          # 3-step wizard header
│   ├── MappingEditor.tsx    # productsoort mapping editor UI
│   ├── PresetBar.tsx        # preset save/load/delete bar
│   ├── Navbar.tsx           # top navigation
│   ├── AppShell.tsx         # app shell wrapper
│   ├── ColumnPreview.tsx    # column data preview
│   ├── SheetPicker.tsx      # multi-sheet selector
│   ├── Tooltip.tsx
│   └── TutorialButton.tsx   # global help button (links to walkthrough video)
├── constants/
│   └── converterMappings.ts # all productsoort lookup tables
├── context/
│   └── LangContext.tsx      # NL/EN language toggle context
├── lib/
│   ├── supabase.ts          # Supabase client (lazy singleton)
│   └── presets.ts           # preset CRUD — currently localStorage-based
├── utils/
│   ├── xlsx.ts              # readFileRaw, sheetTo2D
│   ├── headers.ts           # detectHeaderRow, parseFromHeaderRow, scoreRow
│   ├── columns.ts           # findBestCol auto-detection
│   ├── matching.ts          # normalizeEan, fmtDate, looksLikeEan
│   ├── converter.ts         # buildOutputRows, buildOutputRowsAsync, OUTPUT_COLS
│   └── mappingStore.ts      # productsoort resolution chain, localStorage store
├── views/
│   ├── PriceUpdater.tsx     # Feature 1 — full 3-step view
│   └── SupplierConverter.tsx # Feature 2 — full 3-step view
├── types.ts                 # all shared TypeScript interfaces
├── i18n.ts                  # translation strings (NL/EN)
└── index.css                # global styles
```

---

## 4. Shared infrastructure

### File parsing pipeline (`FileUploadCard.tsx`)

Both features use the same file upload component. When a file is dropped or selected:

1. `readFileRaw(file)` → reads `.xlsx/.xls/.xlsm/.xlsb/.ods` via ArrayBuffer (SheetJS), or `.csv/.tsv/.txt` via plain text. Returns an XLSX `WorkBook` object.
2. `sheetTo2D(ws)` → converts a worksheet to a plain `string[][]`, no assumptions about headers.
3. `detectHeaderRow(rows)` → scores the first 20 rows using `scoreRow()`. Each row gets points for cells that match keyword hint arrays (`EAN_HINTS`, `PRICE_HINTS`, etc.) and mild bonus for short non-numeric cells. Returns the 0-based index of the highest-scoring row.
4. `parseFromHeaderRow(rows, idx)` → uses that row as the header, builds `{ cols: string[], data: Record<string, unknown>[] }`. Empty rows are skipped. Duplicate column names get a `_2`, `_3` suffix. Empty header cells get `Col_1`, `Col_2`, etc. (deterministic, not random).
5. `onFileLoaded(ParsedFile)` fires with the result.

The component also shows: paginated column preview (5 cols × 5 rows, nav arrows), sheet picker for multi-sheet files, header row number override input with Apply button, detection banner, and file size limit (100 MB).

### Type system (`types.ts`)

Key types:
- `ParsedFile` — output of the parsing pipeline; contains `cols`, `data`, `rawSheet` (XLSX worksheet), `workbook`, `fileName`
- `BannerInfo` — `{ type: 'success'|'warning'|'info', icon: string, message: string }` — message is raw HTML string (safe for known-good values)
- `MatchResults` — everything produced by `computeMatching`: updated count, result rows, unmatched products, duplicate EANs, null-EAN rows
- `MatchArgs` — the column selections needed to re-run matching
- `AutoDetected` — result of auto-detect run (nullable column names per field)
- `Preset` — `{ id, name, tool, mappings, created_at }` — stored in localStorage
- `ColRef` — `{ sheet: string, col: string }` — reference to a specific column in a specific sheet
- `SupplierConverterMappings` / `PriceUpdaterMappings` — the full set of user-selected column mappings for each feature

### Language (`LangContext`, `i18n.ts`)

A toggle in the navbar switches the entire UI between Dutch (`nl`) and English (`en`). The context exposes `lang` and `t(key)` for string lookup. Components use `lang === 'nl' ? '...' : '...'` inline or call `t()` for registered keys.

### Presets (`lib/presets.ts`)

Both features support saving and loading column-mapping presets so users don't need to re-select everything each time. Presets are stored in `localStorage` under key `dehaan-presets`. Functions: `listPresets`, `createPreset`, `updatePreset`, `deletePreset`, `exportPresetsFile` (downloads JSON), `importPresetsFile` (reads JSON, deduplicates by name).

Note: Supabase is set up (`lib/supabase.ts`) but the preset system currently uses localStorage, not Supabase. Supabase was integrated during development as a foundation for future backend features.

---

## 5. Feature 1: Price Updater

### Purpose

Takes an Exact Online product export and a supplier price list, matches products by EAN barcode (with article code as fallback), updates the price column, and produces a ready-to-import `.xlsx` plus an audit `.csv`.

### 3-step flow

**Step 1 — Upload**
- Two `FileUploadCard` instances: one for the Exact Online file, one for the supplier file.
- Both support multi-sheet Excel files. Each column mapping (EAN, code, price) can reference a different sheet from the same file via `ColRef`.

**Step 2 — Column mapping**
- Dropdowns to select: EAN column, article code column, price column (Exact file)
- Dropdowns to select: EAN column, extra EAN columns (multiple), article code column, new price column (supplier file)
- Price type toggle: Purchase (`Inkoopprijs`) or Selling (`Verkoopprijs`)
- Optional date pickers: Active From / Active To
- Advanced option: map dates into existing Exact file columns instead of appending new columns
- Auto-detected columns get green border (`auto-detected` CSS class); uncertain columns get amber (`needs-review`)

**Step 3 — Results & Download**
- Metric chips: prices updated, total rows, unmatched EANs, duplicate EANs
- Expandable tables for unmatched products and duplicate EANs
- For duplicate EANs: per-EAN dropdown to select which supplier row's price to use; selecting triggers `reapplyDupeSelections` to recompute without re-parsing
- Paginated preview of the updated output
- Download: updated `.xlsx` (Exact-compatible), audit report `.csv`

### Matching logic (`utils/matching.ts` + `views/PriceUpdater.tsx`)

- `normalizeEan(v)` handles scientific notation from Excel (`1.23e13` → `1230000000000`)
- Primary match: normalized EAN from Exact file against supplier lookup map `supplByEan`
- Fallback: article code string match against `supplByCode`
- Duplicate EANs in supplier file are surfaced in `dupesList` with their occurrence count
- `supplByEan`, `supplByCode`, `allOccurrences` lookup maps stored in `useRef` (not state) — no re-renders
- `matchArgsRef` caches column selections so `reapplyDupeSelections` can recompute without re-parsing files
- When multiple sheets are used for different columns, `supplEanData` uses the EAN sheet's row array (not the primary sheet's) for the supplier row count

### Cross-sheet architecture

Both Exact and supplier files support per-column sheet selection. The `ColRef` type (`{ sheet, col }`) is used throughout the matching args so lookups always go to the right sheet's data.

---

## 6. Feature 2: Supplier Converter

### Purpose

Converts a supplier's product Excel (any format) into the exact fixed column structure that Exact Online requires for importing new products.

### 3-step flow

**Step 1 — Upload**
- Single `FileUploadCard` for the supplier file
- Same smart header detection, sheet picker, header override, and paginated preview

**Step 2 — Field mapping**
- Column selects for all source fields (barcode, productsoort, kostprijs, bestelnummer, verkoopprijs, maat, kleur, veiligheidsclassificatie, geslacht, merk [optional], artikelcode [optional])
- Each column select is a `ColRef` — supports selecting from different sheets of the same file
- Multi-column combiners for `Omschrijving` and `Productnaam` (combine multiple columns with space, truncate Omschrijving to 60 chars)
- Text input for `Hoofdleverancier` (supplier name, free text)
- Dropdown for `Btw-code: Inkoop` (Holland = `3`, Europe = `10`, Outside Europe = `9`)
- Number input for starting `Code` value (auto-increments per row: `startCode + rowIndex + 1`)
- Fixed-value fields shown as read-only labels (Inkoop, Ordergestuurd, Verkoop, Voorraad, Eenheidsfactor, Btw-code: Verkoop, 2026 Controle JW, KMS Synchronisatie)
- **Color mapping panel**: when a kleur column is selected, the app scans all unique color values, shows them in a table, and lets the user rename each value to a standardized name. Features: bulk select, search/filter, sort by modified/unmodified, status indicators (count modified vs unmodified). Performance-optimized to avoid re-renders with large supplier files.
- **Productsoort mapping editor** (`MappingEditor.tsx`): scans all unique productsoort values from the file, shows which ones resolve correctly vs need custom mapping. For unknown values, user can set custom `Artikelgroep` and `Eenheid` overrides stored in `MappingStore` (localStorage).

**Step 3 — Preview & Download**
- Paginated preview of the converted output in the 30-column Exact Online structure
- Row count summary
- Warning banner if source file has zero rows
- Download as `.xlsx` ready to import into Exact Online

### Output columns (all 30, in order)

`Code`, `Actief vanaf`, `Omschrijving`, `Extra omschrijving`, `Artikelgroep: Omschrijving`, `Barcode`, `Productsoort`, `Inkoop`, `Ordergestuurd`, `Verkoop`, `Voorraad`, `Eenheid`, `Btw-code: Verkoop`, `Kostprijs`, `Inkoopeenheid`, `Eenheidsfactor`, `Bestelnummer leverancier`, `Verkoopprijs`, `Hoofdleverancier`, `Btw-code: Inkoop`, `Veiligheidsclassificatie`, `2026 Controle JW`, `Geslacht`, `Maat`, `Merk`, `KMS Synchronisatie`, `Kleur`, `Productnaam`, `Artikelcode`, `Artikelcode Hoofdleverancier zoekveld`

### Derivation rules

- `Actief vanaf` — always first day of current month in `DD-MM-YYYY` format
- `Code` — `startingCode + rowIndex + 1` (auto-incremented from user's starting number)
- `Omschrijving` — concatenated selected columns (space-joined), truncated to 60 chars
- `Extra omschrijving` — same concatenation, NOT truncated (full string)
- `Artikelgroep: Omschrijving` — derived from `Productsoort` via the resolution chain (see below); if `Merk` is set, appended as `"[Artikelgroep] - [Merk]"`
- `Eenheid` and `Inkoopeenheid` — both derived from `Productsoort` via resolution chain
- `Geslacht` — uses source column value if mapped, otherwise defaults to `"Unisex"`
- `Kleur` — uses source value, passed through `kleurMapping[value] ?? value`
- `Artikelcode Hoofdleverancier zoekveld` — exact copy of `Bestelnummer leverancier`
- All boolean fields — always `"Ja"`
- `Btw-code: Verkoop` — always `"2"`
- `2026 Controle JW` — always `"NG"`
- `KMS Synchronisatie` — always `"Ja"`
- `Eenheidsfactor` — always `"1"`

### Async conversion (`utils/converter.ts`)

`buildOutputRowsAsync` processes rows in chunks of 5000 with `setTimeout(0)` yields to keep the UI responsive during large conversions. Reports progress percentage via callback.

---

## 7. Productsoort resolution system (`utils/mappingStore.ts`)

This is the most complex piece of logic in the project. Given a productsoort string from a supplier file, it must find the correct Dutch canonical key to look up `Artikelgroep` and `Eenheid`.

The resolution runs through 8 steps in order:

1. **Custom store exact match** — user has manually overridden this value via MappingEditor
2. **Built-in Dutch table exact/case-insensitive match** — directly in `PRODUCTSOORT_TO_ARTIKELGROEP`
3. **Alias table lookup** — `ENGLISH_TO_DUTCH_PRODUCTSOORT` covers English, German, and French terms, plus deprecated/merged Dutch names
4. **Substring match** — normalized input contains a built-in key or vice versa (handles compound words like "Veiligheidshandschoenen" → "Handschoenen")
5. **Token match** — splits multi-word input and matches individual tokens (handles "Work Safety Gloves" → token "Gloves" → "Handschoenen")
6. **Levenshtein fuzzy match** — finds the closest key within an edit-distance threshold scaled by word length. Cached per unique value. Handles typos.
7. **Custom store case-insensitive** — catches custom entries that differ in case
8. **Default fallback** — `"Kleding"` / `"Stuks"`

The constants file (`converterMappings.ts`) contains:
- `PRODUCTSOORT_TO_ARTIKELGROEP` — ~70 canonical Dutch product types → article groups
- `PRODUCTSOORT_TO_EENHEID` — same keys → unit (`Stuks` or `Paar`)
- `ENGLISH_TO_DUTCH_PRODUCTSOORT` — ~250 English/German/French/deprecated-Dutch aliases → Dutch canonical keys
- `ARTIKELGROEP_OPTIONS` — the 7 valid article group values

---

## 8. Security fixes applied (all resolved)

These issues were identified in a full security audit and fixed:

| Issue | Severity | Fix applied |
|-------|----------|-------------|
| XSS via preset names in Banner HTML | Critical | HTML-escape `<`, `>`, `&` before interpolating user values into HTML strings in `applyPreset` (both PriceUpdater and SupplierConverter) |
| Cross-sheet row count mismatch | High | `sRowCount = supplEanData.length` (was incorrectly using `supplFile!.data.length` which pointed to the wrong sheet) |
| `fmtDate` 2-digit year bug | High | Changed `p[0].slice(2)` to `p[0]` — was writing `25` instead of `2025` in all date columns |
| localStorage JSON validation | High | Added `isValidStore()` shape validator in `mappingStore.ts` before trusting parsed JSON |
| Detached anchor element | Medium | `document.body.appendChild(a)` before `a.click()` in `exportMappingStore` and `exportPresetsFile` (Firefox/Safari require attachment) |
| Non-null assertion crashes | Medium | Added null guards in `reapplyDupeSelections` and `handleRedetect` |
| Random column names | Medium | Replaced `Math.random()` with deterministic `Col_${ci+1}` in `parseFromHeaderRow` |
| Missing empty-output warning | Low | Warning banner in Step 3 of SupplierConverter when `outputData.length === 0` |
| `downloadDupes` crash on empty | Low | Early return guard added |
| `ARTIKELGROEP_ALL_OPTS` declaration order | Low | Moved constant declaration to before first use in `MappingEditor.tsx` |

---

## 9. Development history (chronological)

The project went through ~10 development sessions:

1. **Initial setup** — created the project skeleton; first working version of Price Updater with basic file upload and column matching
2. **Smart header detection** — built `detectHeaderRow` / `scoreRow` to automatically find the header row in any Excel file (not always row 1)
3. **Multi-sheet support** — extended `ColRef` system so each column mapping can come from a different sheet; added `SheetPicker` component
4. **Auto-detection** — built `findBestCol` in `columns.ts`; dropdowns auto-select the most likely column based on name hints and content scanning; green/amber border feedback
5. **Supplier Converter v1** — first version of the Supplier Converter feature, modeled after Price Updater
6. **Color mapping** — added the color value mapping panel: detect unique values, allow per-value renaming, bulk select, search, sort by status
7. **Performance optimization** — after a crash with large supplier files, refactored color mapping to avoid state-triggered re-renders on hundreds of entries; added `buildOutputRowsAsync` with chunked processing and progress indicator
8. **Preset system** — added preset save/load for column mappings so users don't re-select each time; presets stored in localStorage; export/import as JSON
9. **Productsoort mapping editor** — added `MappingEditor` component and the full resolution chain (substring, token, Levenshtein); users can override unknown values via the UI
10. **Supabase integration** — added `@supabase/supabase-js`, created `lib/supabase.ts`, wired up environment variables; Supabase is ready as backend but preset storage still uses localStorage
11. **Productsoort alias table** — expanded `ENGLISH_TO_DUTCH_PRODUCTSOORT` with English, German, French, and deprecated Dutch terms (~250 entries); removed 14 deprecated Dutch entries from the canonical table, kept them as aliases
12. **Security & bug fixes** — full audit; fixed XSS, date bug, localStorage validation, null crashes, and other issues listed in section 8

---

## 10. Known state / what still exists as future work

- **Supabase backend for presets**: The Supabase client is initialized but presets are still localStorage-only. The architecture is ready to migrate — `presets.ts` would just need its `getAll`/`saveAll` to call Supabase instead of `localStorage`.
- **Exact Online API integration**: Long-term vision is for the tool to connect directly to Exact Online so the user doesn't need to export/import manually. Not started.
- **No tests**: No test framework is set up. All validation is done via TypeScript and manual testing.
- **Vercel deployment**: `vercel.json` is present; the app is configured for deployment but the current status of the live deployment is not tracked in this document.

---

## 11. Important architectural decisions

- **`useRef` for lookup maps**: In PriceUpdater, the heavy lookup maps (`supplByEan`, `supplByCode`, `allOccurrences`) are stored in `useRef` because they don't need to trigger re-renders. Only the final `MatchResults` goes into `useState`.
- **`ColRef` everywhere**: Column selections in SupplierConverter use `{ sheet, col }` pairs rather than just column names, because different columns can come from different sheets of the same workbook.
- **No component-level file parsing**: All parsing logic lives in `FileUploadCard`. Feature components (`PriceUpdater`, `SupplierConverter`) only receive `ParsedFile` objects via the `onFileLoaded` callback — they never call SheetJS directly.
- **Constants file as the single source of truth**: The mapping tables in `converterMappings.ts` are designed to be editable without touching any component logic. Anything that changes business-level classification goes there.
- **HTML in Banner messages**: `Banner.tsx` renders its `message` prop via `dangerouslySetInnerHTML` to support `<strong>` tags. All user-supplied values must be HTML-escaped before interpolation (fixed in the security audit).

---

## 12. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Both are required for Supabase to initialize. A `.env.local.example` file exists at the project root as a template. The actual `.env.local` is gitignored.
