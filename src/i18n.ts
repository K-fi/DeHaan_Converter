export type Lang = 'nl' | 'en';

// [nl, en]
const T: Record<string, [string, string]> = {
  // ── Navbar ──────────────────────────────────────────────
  navPrice:             ['Prijsupdater',               'Price Updater'],
  navConverter:         ['Leverancierconverter',        'Supplier Converter'],

  // ── Stepper ──────────────────────────────────────────────
  stepWord:             ['Stap',                        'Step'],
  puStep1:              ['Bestanden uploaden',           'Upload files'],
  puStep2:              ['Kolommen & datums',            'Map columns & dates'],
  puStep3:              ['Resultaten & downloaden',      'Results & Download'],
  scStep1:              ['Bestand uploaden',             'Upload file'],
  scStep2:              ['Kolommen koppelen',            'Map fields'],
  scStep3:              ['Voorbeeld & downloaden',       'Preview & Download'],

  // ── FileUploadCard ───────────────────────────────────────
  fuClickUpload:        ['Klik om te uploaden',          'Click to upload'],
  fuOrDrop:             ['of sleep het bestand hierheen','or drag & drop'],
  fuHeaderOnRow:        ['Koptekst op rij',              'Header on row'],
  fuApply:              ['Toepassen',                    'Apply'],
  fuSheetLabel:         ['📑 Tabblad',                   '📑 Sheet'],

  // ── PreviewTable ─────────────────────────────────────────
  previewRows:          ['rijen',                        'rows'],
  previewCols:          ['kolommen',                     'cols'],
  previewShowing:       ['getoond',                      'showing'],

  // ── ColumnPreview ────────────────────────────────────────
  colPreviewLabel:      ['Voorbeeld',                    'Preview'],
  colPreviewTooltip:    ['Eerste waarden uit deze kolom in uw bestand. Helpt u te bevestigen dat u de juiste kolom hebt geselecteerd.', 'First values found in this column from your file. Helps you confirm you selected the right column.'],

  // ── Shared buttons ───────────────────────────────────────
  btnBack:              ['← Terug',                      '← Back'],
  btnContinue:          ['Doorgaan →',                   'Continue →'],

  // ── PriceUpdater ─────────────────────────────────────────
  puTitle:              ['Exact Online — Prijsupdater',  'Exact Online — Price Updater'],
  puDesc:               [
    'Upload uw Exact Online productexport en een leverancier prijslijst — het hulpmiddel matcht producten op EAN-barcode (met artikelcode als terugval) en schrijft de nieuwe prijzen direct in het Exact-bestand, klaar om opnieuw te importeren. Ondersteunt .xlsx, .xls, .xlsm, .ods, .csv, .tsv.',
    'Upload your Exact Online product export and a supplier price list — the tool matches products by EAN barcode (with article code as fallback) and writes the new prices directly into the Exact file, ready to re-import. Supports .xlsx, .xls, .xlsm, .ods, .csv, .tsv.',
  ],
  puExactFileTitle:     ['Exact Online exportbestand',   'Exact Online export file'],
  puSupplFileTitle:     ['Leverancier prijslijst',       'Supplier price list'],

  puExactCardTitle:     ['Exact Online bestand — kolomkoppeling', 'Exact Online file — column mapping'],
  puExactCardDesc:      [
    'Geef aan welke kolommen in uw Exact-export de barcode, artikelcode en bij te werken prijs bevatten. Beweeg de muis over ⓘ voor meer uitleg.',
    'Tell the tool which columns in your Exact export contain the barcode, article code, and the price field to update. Hover ⓘ on any label for details.',
  ],
  puSupplCardTitle:     ['Leveranciersbestand — kolomkoppeling', 'Supplier file — column mapping'],
  puSupplCardDesc:      [
    'Geef aan welke kolommen in het leveranciersbestand de barcode, artikelcode en nieuwe prijzen bevatten.',
    'Tell the tool which columns in the supplier file contain the barcode, article code, and the new prices to apply.',
  ],
  puMultiSheetNote:     [
    'Meerdere tabbladen gedetecteerd — gebruik de kleine tabbladkiezer boven elke dropdown om uit een ander tabblad te kiezen.',
    'Multiple sheets detected — use the small sheet selector above each dropdown to pick from a different sheet.',
  ],

  puEanCol:             ['EAN / barcodekolom',           'EAN / barcode column'],
  puArticleCode:        ['Artikelcode (optionele terugval)', 'Article code (optional fallback)'],
  puPriceColUpdate:     ['Bij te werken prijskolom',     'Price column to update'],
  puPriceType:          ['Prijstype',                    'Price type'],
  puInkoop:             ['Inkoopprijs',                  'Purchase price (inkoopprijs)'],
  puVerkoop:            ['Verkoopprijs',                 'Selling price (verkoopprijs)'],
  puNewPriceCol:        ['Nieuwe prijskolom',            'New price column'],
  puAddEan:             ['＋ Meer EAN-kolommen toevoegen', '＋ Add more EAN columns'],
  puRemoveEan:          ['－ Extra EAN-kolommen verwijderen', '－ Remove extra EAN columns'],
  puExtraEanNote:       ['Extra EAN-kolommen om ook te zoeken (uit hetzelfde tabblad)', 'Additional EAN columns to also search (from same sheet)'],

  puDatesCardTitle:     ['Actieve datums (optioneel)',   'Active dates (optional)'],
  puDatesCardDesc:      [
    'Leeg laten om over te slaan. Ingevulde datums worden naar elke bijgewerkte rij geschreven.',
    'Leave blank to skip. Filled dates are written into every updated row.',
  ],
  puActiveFrom:         ['Actief vanaf',                 'Active from'],
  puActiveFromHint:     ['Datum vanaf wanneer de nieuwe prijs geldig is.', 'Date from which the new price becomes active.'],
  puActiveTo:           ['Actief tot',                   'Active to'],
  puActiveToHint:       ['Datum tot wanneer de prijs geldig is. Leeg laten voor onbepaalde tijd.', 'Date until the price is valid. Leave blank for indefinite.'],
  puProcess:            ['Bestanden verwerken →',        'Process files →'],

  puAutoDet:            ['EAN- en prijskolommen automatisch gedetecteerd. Controleer hieronder.', 'EAN and price columns auto-detected. Please verify below.'],
  puAutoDetFail:        ['Niet alle kolommen konden worden gedetecteerd — selecteer ze handmatig.', 'Could not detect all columns — please select manually.'],

  puResultsCardTitle:   ['Verwerkingsrapport',           'Processing report'],
  puPriceTypeChip:      ['Prijstype',                    'Price type'],
  puPurchaseChip:       ['Inkoop',                       'Purchase (inkoop)'],
  puSellingChip:        ['Verkoop',                      'Selling (verkoop)'],
  puActiveFromChip:     ['Actief vanaf',                 'Active from'],
  puActiveToChip:       ['Actief tot',                   'Active to'],

  puMetricUpdated:      ['prijzen bijgewerkt',           'prices updated'],
  puMetricTotal:        ['Exact regels totaal',          'exact rows total'],
  puMetricUnmatched:    ['niet-gevonden EANs',           'unmatched EANs'],
  puMetricDupes:        ['dubbele EANs',                 'duplicate EANs'],
  puMetricNullSuppl:    ['ontbrekende EANs (leverancier)', 'missing EANs (supplier)'],
  puMetricNullExact:    ['ontbrekende EANs (Exact)',     'missing EANs (Exact)'],

  puUnmatchedTitle:     ['Niet-gevonden producten — EAN niet in leveranciersbestand', 'Unmatched products — EAN not found in supplier file'],
  puColEan:             ['EAN',                          'EAN'],
  puColArticle:         ['Artikelcode',                  'Article code'],
  puColCurrentPrice:    ['Huidige prijs',                'Current price'],
  puColStatus:          ['Status',                       'Status'],
  puBadgeNotMatched:    ['Niet gevonden',                'Not matched'],
  puDlUnmatched:        ['⬇ Niet-gevonden downloaden (.xlsx)', '⬇ Download unmatched (.xlsx)'],

  puDupesTitle:         ['Dubbele EANs in leveranciersbestand', 'Duplicate EANs in supplier file'],
  puColOccurrences:     ['Voorkomens',                   'Occurrences'],
  puColAllPrices:       ['Alle verschillende prijzen',   'All different prices'],
  puColUsedUpdate:      ['Gebruikt voor update',         'Used for update'],
  puColPriceInUse:      ['Gebruikte prijs',              'Price in use'],
  puBadgeUpdated:       ['Bijgewerkt',                   'Updated'],
  puOccurrence:         ['voorkomen',                    'occurrence'],
  puReapplyDupes:       ['↻ Prijsselecties opnieuw toepassen', '↻ Reapply price selections'],
  puDlDupes:            ['⬇ Duplicaten downloaden (.xlsx)', '⬇ Download duplicates (.xlsx)'],

  puNullSupplTitle:     ['Ontbrekende EAN — leverancierregels zonder barcode (stilzwijgend overgeslagen)', 'Missing EAN — supplier rows with no barcode (silently skipped)'],
  puColNum:             ['#',                            '#'],
  puColPrice:           ['Prijs',                        'Price'],
  puBadgeNoEan:         ['Geen EAN',                     'No EAN'],
  puDlNullEan:          ['⬇ Regels met ontbrekende EAN downloaden (.xlsx)', '⬇ Download missing EAN rows (.xlsx)'],
  puNullExactTitle:     ['Ontbrekende EAN — Exact-regels zonder barcode (kunnen niet worden bijgewerkt)', 'Missing EAN — Exact file rows with no barcode (cannot be updated)'],

  puPreviewCardTitle:   ['Voorbeeld bijgewerkt bestand', 'Updated file preview'],
  puHeaderFilterActive: ['✓ Headerfilter actief',        '✓ Header filter active'],
  puDlReport:           ['⬇ Rapport downloaden (.csv)',  '⬇ Download report (.csv)'],
  puDlFile:             ['⬇ Bijgewerkt bestand downloaden (.xlsx)', '⬇ Download updated file (.xlsx)'],
  puDlFileSplit:        ['⬇ Downloaden per 999 rijen',  '⬇ Download per 999 rows'],

  // ── PriceUpdater tooltips ────────────────────────────────
  ttExactEan:     ['Kolom met EAN/GTIN-barcodes in uw Exact-export. Primaire sleutel voor het matchen van producten. Automatisch gedetecteerd op basis van kolomnamen en inhoud.', 'Column containing EAN/GTIN barcodes in your Exact export. Used as the primary key to match products with the supplier file. Auto-detected from column names and content.'],
  ttExactCode:    ['Optioneel. Als er geen EAN-match wordt gevonden, probeert het hulpmiddel te matchen op artikelcode. Selecteer de kolom met uw interne Exact-artikelnummers. Leeg laten om deze terugval uit te schakelen.', 'If a product has no matching EAN, the tool tries to match it by article code instead. Select the column containing your internal Exact article numbers. Leave empty to skip this fallback.'],
  ttExactPrice:   ['De prijskolom waarvan de waarden worden overschreven met de nieuwe prijzen uit het leveranciersbestand. Alleen gevonden regels worden bijgewerkt.', 'The column whose price values will be overwritten with the new prices from the supplier file. Only matched rows are updated — unmatched rows are left unchanged.'],
  ttPriceType:    ['Geeft aan welk type prijs u bijwerkt. Inkoopprijs = wat De Haan aan de leverancier betaalt. Verkoopprijs = wat klanten betalen. Dit is alleen voor registratie en verandert niet hoe prijzen worden geschreven.', 'Indicates what type of price you are updating. Purchase price = what De Haan pays the supplier. Selling price = what customers pay. This is for your records only — it does not change how prices are written.'],
  ttSupplEan:     ['Kolom met EAN/GTIN-barcodes in het leveranciersbestand. Worden vergeleken met uw Exact-export om de juiste producten te vinden. Ondersteunt wetenschappelijke notatie (bijv. 1,23E+12) automatisch.', 'Column with EAN/GTIN barcodes in the supplier file. Matched against your Exact export to identify which products to update. Supports scientific notation (e.g. 1.23E+12) automatically.'],
  ttSupplCode:    ['Optioneel. Als EAN-matching mislukt, probeert het hulpmiddel te matchen op artikelcode. Moet overeenkomen met de artikelcodes in uw Exact-bestand.', "Optional. If EAN matching fails, the tool tries to match by article code. Select the supplier's article code column — these must correspond to the article codes in your Exact file."],
  ttSupplPrice:   ['Kolom met de bijgewerkte prijzen die de huidige prijzen in uw Exact-bestand vervangen voor elk gevonden product.', 'Column in the supplier file containing the updated prices. These values replace the current prices in your Exact file for every matched product.'],
  ttActiveFrom:   ["De datum vanaf wanneer de nieuwe prijs van kracht is. Wordt geschreven naar elke bijgewerkte rij. Leeg laten als u geen begindatum wilt instellen.", "The date from which the new price takes effect. Written into every updated row. Leave blank if you do not want to set a start date."],
  ttActiveTo:     ['De datum tot wanneer de nieuwe prijs geldig is. Leeg laten als de prijs voor onbepaalde tijd geldt.', 'The date until the new price is valid. Leave blank if the price applies indefinitely.'],

  // ── PriceUpdater report tooltips ────────────────────────
  ttMetricUpdated:  ['Aantal rijen in uw Exact-export waarbij een overeenkomend EAN of artikelcode werd gevonden en de prijs is overschreven.', 'Number of rows in your Exact export where a matching EAN or article code was found and the price was overwritten.'],
  ttMetricTotal:    ['Totaal aantal datarijen in uw Exact-exportbestand, exclusief de koptekstrij.', 'Total number of data rows in your Exact export file, excluding the header row.'],
  ttUnmatched:      ['Producten in uw Exact-export waarvoor geen overeenkomend EAN of artikelcode werd gevonden in het leveranciersbestand. Deze prijzen zijn ongewijzigd gelaten.', 'Products in your Exact export for which no matching EAN or article code was found in the supplier file. These prices were left unchanged.'],
  ttDupes:          ['Dezelfde EAN komt meerdere keren voor in het leveranciersbestand, mogelijk met verschillende prijzen. Gebruik de dropdown om te kiezen welke prijs wordt gebruikt, klik daarna op "Opnieuw toepassen".', 'The same EAN appears more than once in the supplier file, possibly with different prices. Use the dropdown to pick which price to use, then click "Reapply".'],
  ttNullSuppl:      ['Rijen in het leveranciersbestand zonder barcodewaarde. Deze rijen worden volledig overgeslagen — zonder EAN kan er geen match worden gemaakt.', 'Rows in the supplier file with no barcode value. These rows are silently skipped — without an EAN they cannot be matched against anything.'],
  ttNullExact:      ['Rijen in uw Exact-export zonder barcodewaarde. Omdat EAN de primaire matchingsmethode is, kunnen deze rijen niet via barcode worden bijgewerkt. Als u een artikelcode-kolom hebt geselecteerd, kunnen ze via die terugval alsnog worden gevonden.', 'Rows in your Exact export with no barcode value. Since EAN is the primary matching method these rows cannot be updated by barcode. If you selected an article code column they may still be matched via that fallback.'],
  ttScMetricConverted: ['Aantal productrijen uit het leveranciersbestand dat succesvol is omgezet naar het Exact Online-importformaat.', 'Number of product rows from the supplier file that were successfully converted to the Exact Online import format.'],
  ttScMetricCols:      ['Het totaal aantal kolommen in het uitvoerbestand — komt exact overeen met de Exact Online-importsjabloon.', 'Total number of columns in the output file — matches the Exact Online import template exactly.'],

  // ── SupplierConverter ────────────────────────────────────
  scTitle:              ['Exact Online — Leverancierconverter', 'Exact Online — Supplier Data Converter'],
  scDesc:               [
    'Upload een leveranciersproductbestand in welk formaat dan ook — het hulpmiddel koppelt elke kolom aan het juiste Exact Online-veld en produceert een importklaar .xlsx-bestand met alle vereiste kolommen automatisch ingevuld.',
    'Upload a supplier product file in any format — the tool maps each supplier column to the correct Exact Online field and produces a ready-to-import .xlsx file with all required columns filled in automatically.',
  ],

  scSettingsCardTitle:  ['Leveranciersinstellingen',     'Supplier settings'],
  scSettingsCardDesc:   ['Vul de vaste waarden in die voor elke rij in dit leveranciersproductbestand gelden.', "Enter the fixed values that apply to every row in this supplier's product file."],
  scMappingCardTitle:   ['Kolomkoppelingen',             'Column mappings'],
  scMappingCardDesc:    [
    'Koppel elk veld aan de bijbehorende kolom in het leveranciersbestand. Groene rand = automatisch gedetecteerd; oranje = handmatig selecteren. Beweeg de muis over ⓘ voor uitleg.',
    'Map each field to the matching column in your supplier file. Green border = auto-detected; amber = needs manual selection. Hover ⓘ on any label for a description.',
  ],
  scMultiSheetNote:     [
    'Dit bestand heeft meerdere tabbladen. Gebruik de kleine tabbladkiezer boven elke dropdown om kolommen uit verschillende tabbladen te kiezen.',
    'This file has multiple sheets. Use the small sheet selector above each dropdown to pick columns from different sheets.',
  ],
  scOptionalCols:       ['Optionele kolommen',           'Optional columns'],
  scDescColsCardTitle:  ['Omschrijvingskolommen',        'Description columns'],
  scDescColsCardDesc:   [
    'Selecteer welke leverancierskolommen worden gecombineerd voor de productomschrijving en -naam. U kunt meerdere kolommen kiezen en de volgorde aanpassen.',
    'Select which supplier columns to combine for the product description and name. You can pick multiple columns and drag them into order.',
  ],
  scFixedCardTitle:     ['Vaste uitvoerwaarden',         'Fixed output values'],
  scFixedCardDesc:      ['Deze velden worden automatisch ingesteld — geen invoer vereist.', 'These fields are set automatically — no input needed.'],

  scHoofdleverancier:   ['Hoofdleverancier',             'Main supplier'],
  scHoofdlevHint:       ['Wordt naar elke rij in het uitvoerbestand geschreven.', 'Written to every row in the output.'],
  scHoofdlevPlaceholder:['bijv. Nike',                   'e.g. Nike'],
  scBtwInkoop:          ['Btw-code: Inkoop',             'VAT code: Purchase'],
  scBtwHolland:         ['Nederland (3)',                'Holland (3)'],
  scBtwEurope:          ['Europa (9)',                   'Europe (9)'],
  scBtwOutside:         ['Buiten Europa (10)',           'Outside Europe (10)'],
  scLastCode:           ['Laatste gebruikte codenummer', 'Last used code number'],
  scLastCodeHint:       ['Nieuwe rijen krijgen dit nummer + 1, + 2, enz.', 'New rows are assigned this number + 1, + 2, etc.'],
  scLastCodePlaceholder:['bijv. 1000',                   'e.g. 1000'],

  scBarcode:            ['Barcode',                      'Barcode'],
  scProductsoort:       ['Productsoort',                 'Product type'],
  scProductsoortHint:   ['Bepaalt de Artikelgroep en Eenheid per rij.', 'Drives Artikelgroep and Eenheid derivation.'],
  scKostprijs:          ['Kostprijs',                    'Cost price'],
  scBestelnummer:       ['Bestelnummer leverancier',     'Supplier order number'],
  scBestelnummerHint:   ["Wordt ook gekopieerd naar 'Artikelcode Hoofdleverancier zoekveld'.", 'Also copied to Artikelcode Hoofdleverancier zoekveld.'],
  scVerkoopprijs:       ['Verkoopprijs',                 'Selling price'],
  scMaat:               ['Maat',                         'Size'],
  scKleur:              ['Kleur',                        'Color'],
  scVeiligheid:         ['Veiligheidsclassificatie',     'Safety classification'],
  scGeslacht:           ['Geslacht',                     'Gender'],
  scGeslachtDefault:    ['— standaard Unisex —',         '— default to Unisex —'],
  scMerk:               ['Merk',                         'Brand'],
  scArtikelcode:        ['Artikelcode',                  'Article code'],
  scOmschrijving:       ['Omschrijving',                 'Description'],
  scOmschrijvingHint:   ['Selecteer een of meer kolommen. Waarden worden samengevoegd en afgekapt tot 60 tekens. Extra omschrijving bevat de volledige niet-afgekapte waarde.', 'Select one or more columns. Values are joined and truncated to 60 characters. Extra omschrijving gets the full untruncated value.'],
  scProductnaam:        ['Productnaam',                  'Product name'],
  scProductnaamHint:    ['Selecteer kolommen om te combineren — typisch: merk + producttype + artikeltype + veiligheidscode.', 'Select columns to combine — typically: brand + product type + article type + safety classification code.'],

  scActiviefVanaf:      ['Actief vanaf',                 'Active from'],
  scInkoop:             ['Inkoop',                       'Purchase'],
  scOrdergestuurd:      ['Ordergestuurd',                'Order driven'],
  scVerkoop:            ['Verkoop',                      'Sales'],
  scVoorraad:           ['Voorraad',                     'Stock'],
  scBtwVerkoop:         ['Btw-code: Verkoop',            'VAT code: Sales'],
  scEenheidsfactor:     ['Eenheidsfactor',               'Unit factor'],
  scKmsSynch:           ['KMS Synchronisatie',           'KMS Synchronisation'],
  scControle:           ['2026 Controle JW',             '2026 Control JW'],
  scEenheidCombo:       ['Eenheid + Inkoopeenheid',      'Unit + Purchase unit'],
  scArtikelcodeZoek:    ['Artikelcode Hoofdleverancier zoekveld', 'Supplier article code search field'],
  scDerivedFrom:        ['Afgeleid van Productsoort',    'Derived from Product type'],
  scCopyOf:             ['Kopie van Bestelnummer leverancier', 'Copy of Supplier order number'],

  scKleurMapping:       ['Kleur — waardentoewijzing',    'Color — value mapping'],
  scKleurSearchPh:      ['Waarden zoeken…',              'Search values…'],
  scKleurSelectFiltered:['Gefilterd selecteren',         'Select filtered'],
  scKleurSelectAll:     ['Alles selecteren',             'Select all'],
  scKleurResetAll:      ['Alles resetten',               'Reset all'],
  scKleurNewValuePh:    ['Nieuwe waarde voor alle geselecteerde…', 'New value for all selected…'],
  scKleurApply:         ['Toepassen',                    'Apply'],
  scKleurCancel:        ['Annuleren',                    'Cancel'],
  scKleurOriginal:      ['Oorspronkelijke waarde',       'Original value'],
  scKleurOutput:        ['Uitvoerwaarde',                'Output value'],
  scKleurModified:      ['aangepast',                    'modified'],
  scKleurUnmodified:    ['niet aangepast',               'unmodified'],
  scKleurNoMatch:       ['Geen waarden komen overeen met', 'No values match'],

  scBack:               ['← Terug',                      '← Back'],
  scConvert:            ['Converteren →',                'Convert →'],
  scDownload:           ['⬇ Geconverteerd bestand downloaden (.xlsx)', '⬇ Download converted file (.xlsx)'],

  scConvCompleteTitle:  ['Conversie voltooid',           'Conversion complete'],
  scChipSupplier:       ['Leverancier',                  'Supplier'],
  scChipBtw:            ['Btw Inkoop',                   'Btw Inkoop'],
  scChipCodesFrom:      ['Codes vanaf',                  'Codes from'],
  scMetricConverted:    ['rijen geconverteerd',          'rows converted'],
  scMetricCols:         ['uitvoerkolommen',              'output columns'],
  scPreviewCardTitle:   ['Voorbeeld uitvoer',            'Output preview'],
  scPreviewCardDesc:    [
    'Eerste rijen in de kolomvolgorde van Exact Online — gebruik de pijlen om door alle kolommen te bladeren.',
    'First rows in Exact Online column order — use the arrows to page through all columns.',
  ],

  scAutoDetAll:         ['Alle {n} vereiste kolommen automatisch gedetecteerd. Controleer hieronder.', 'Auto-detected all {n} required columns. Please verify below.'],
  scAutoDetPartial:     ['{det} van {n} vereiste kolommen automatisch gedetecteerd — gemarkeerde velden vereisen handmatige selectie.', 'Auto-detected {det} of {n} required columns — highlighted fields need manual selection.'],

  // ── SupplierConverter tooltips ────────────────────────────
  ttBarcode:        ['De barcodekolom (EAN/GTIN) — doorgaans 13-cijferige nummers. Identificeert elk product in Exact Online en wordt gebruikt voor matching.', 'The barcode (EAN/GTIN) column — typically 13-digit numbers. This identifies each product in Exact Online and is used for matching.'],
  ttProductsoort:   ['Producttype (bijv. Jas, Schoen, Tas). Bepaalt automatisch de Artikelgroep en Eenheid voor elke rij — geen handmatige koppeling nodig.', 'Product type column (e.g. Jas, Schoen, Tas). Automatically determines the Artikelgroep and Eenheid for every row — no manual mapping needed.'],
  ttKostprijs:      ['Inkoopprijs — wat De Haan aan de leverancier betaalt. Wordt geschreven naar Kostprijs in Exact Online.', 'Purchase price — what De Haan pays the supplier. Written to the Kostprijs column in Exact Online.'],
  ttBestelnummer:   ["Het eigen bestel- of artikelnummer van de leverancier. Wordt ook automatisch gekopieerd naar 'Artikelcode Hoofdleverancier zoekveld'.", "The supplier's own order or article number. Also automatically copied to 'Artikelcode Hoofdleverancier zoekveld' so products can be found by supplier code in Exact."],
  ttVerkoopprijs:   ['Aanbevolen verkoopprijs voor klanten. Wordt geschreven naar Verkoopprijs in Exact Online.', 'Recommended selling price for customers. Written to Verkoopprijs in Exact Online.'],
  ttMaat:           ['Maatkolom (bijv. S, M, L, XL of numerieke maten zoals 38, 40, 42).', 'Size column (e.g. S, M, L, XL or numeric sizes such as 38, 40, 42).'],
  ttKleur:          ['Kleurkolom. Na het selecteren verschijnt er een tabel hieronder om ruwe kleurwaarden te hernoemen naar gestandaardiseerde namen.', 'Color column. After selecting, a mapping table appears below where you can rename raw color values to standardized names before export.'],
  ttVeiligheid:     ['Veiligheids- of CE-classificatiecodes. Leeg laten als de leverancier deze informatie niet verstrekt.', 'Safety or CE classification codes. Leave empty if the supplier does not provide this information.'],
  ttGeslacht:       ["Geslachtskolom (bijv. Heren, Dames, Unisex). Rijen zonder waarde krijgen standaard 'Unisex'. Leeg laten als dit niet in het leveranciersbestand staat.", "Gender column (e.g. Heren, Dames, Unisex). Rows with no value default to 'Unisex'. Leave empty if not in this supplier's file."],
  ttMerk:           ['Merknaamkolom. Optioneel — leeg laten als het bestand geen merkkolom bevat.', 'Brand name column. Optional — leave empty if the supplier file does not include a brand column.'],
  ttArtikelcode:    ['Intern artikelnummer of SKU van de leverancier. Optioneel.', "Supplier's internal article code or SKU. Optional — leave empty if not needed."],
  ttHoofdlev:       ["De naam van de leverancier precies zoals die in Exact Online moet verschijnen. Wordt naar elke rij in het uitvoerbestand geschreven.", "The supplier's name exactly as it should appear in Exact Online. Written into every row of the output file."],
  ttBtwInkoop:      ['BTW-code op basis van het land van herkomst: Nederland = 3, Europa = 9, Buiten Europa = 10.', "VAT code based on the supplier's country of origin: Holland = 3, Europe = 9, Outside Europe = 10."],
  ttLastCode:       ['Het laatste artikelcodenummer dat momenteel in Exact Online wordt gebruikt. Nieuwe rijen krijgen dit nummer + 1, + 2, enzovoort.', 'Enter the last article code number currently in Exact Online. New rows are assigned this number + 1, + 2, and so on.'],
  ttOmschrijving:   ['Selecteer een of meer kolommen waarvan de waarden worden samengevoegd (spatie-gescheiden). De eerste 60 tekens gaan naar Omschrijving; de volledige tekst naar Extra omschrijving.', 'Select one or more columns whose values will be joined (space-separated). The first 60 characters go into Omschrijving; the full untruncated text goes into Extra omschrijving.'],
  ttProductnaam:    ['Selecteer kolommen voor de productnaam. Typisch: merk + producttype + artikeltype + veiligheidscode. Waarden worden samengevoegd met een spatie.', 'Select columns to combine into the product name. Typically: brand + product type + article type + safety classification code. Values are joined with a space.'],
};

export function translate(key: string, lang: Lang): string {
  const entry = T[key];
  if (!entry) return key;
  return lang === 'nl' ? entry[0] : entry[1];
}
