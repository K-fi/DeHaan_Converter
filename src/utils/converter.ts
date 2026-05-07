import {
  PRODUCTSOORT_TO_ARTIKELGROEP,
  PRODUCTSOORT_TO_EENHEID,
  DEFAULT_ARTIKELGROEP,
  DEFAULT_EENHEID,
} from '../constants/converterMappings';
import type { ColRef } from '../types';

export interface ConverterArgs {
  sheetsData: Record<string, Record<string, unknown>[]>;
  rowCount: number;
  startingCode: number;
  hoofdleverancier: string;
  btwInkoop: string;
  barcodeRef: ColRef;
  productsoortRef: ColRef;
  kostprijsRef: ColRef;
  bestelnummerRef: ColRef;
  verkoopprijsRef: ColRef;
  veiligheidsclassificatieRef: ColRef;
  geslachtRef: ColRef;
  maatRef: ColRef;
  merkRef: ColRef;
  kleurRef: ColRef;
  kleurMapping: Record<string, string>;
  artikelcodeRef: ColRef;
  omschrijvingRefs: ColRef[];
  productnaamRefs: ColRef[];
}

export const OUTPUT_COLS = [
  'Code',
  'Actief vanaf',
  'Omschrijving',
  'Extra omschrijving',
  'Artikelgroep: Omschrijving',
  'Barcode',
  'Productsoort',
  'Inkoop',
  'Ordergestuurd',
  'Verkoop',
  'Voorraad',
  'Eenheid',
  'Btw-code: Verkoop',
  'Kostprijs',
  'Inkoopeenheid',
  'Eenheidsfactor',
  'Bestelnummer leverancier',
  'Verkoopprijs',
  'Hoofdleverancier',
  'Btw-code: Inkoop',
  'Veiligheidsclassificatie',
  '2026 Controle JW',
  'Geslacht',
  'Maat',
  'Merk',
  'KMS Synchronisatie',
  'Kleur',
  'Productnaam',
  'Artikelcode',
  'Artikelcode Hoofdleverancier zoekveld',
] as const;

function firstOfCurrentMonth(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `01-${m}-${now.getFullYear()}`;
}

function getVal(
  sheetsData: Record<string, Record<string, unknown>[]>,
  rowIdx: number,
  ref: ColRef,
): string {
  if (!ref.col) return '';
  const rows = sheetsData[ref.sheet] ?? [];
  const row = rows[rowIdx] ?? {};
  return String(row[ref.col] ?? '').trim();
}

export function buildOutputRows(args: ConverterArgs): Record<string, unknown>[] {
  const {
    sheetsData,
    rowCount,
    startingCode,
    hoofdleverancier,
    btwInkoop,
    barcodeRef,
    productsoortRef,
    kostprijsRef,
    bestelnummerRef,
    verkoopprijsRef,
    veiligheidsclassificatieRef,
    geslachtRef,
    maatRef,
    merkRef,
    kleurRef,
    kleurMapping,
    artikelcodeRef,
    omschrijvingRefs,
    productnaamRefs,
  } = args;

  const activiefVanaf = firstOfCurrentMonth();

  return Array.from({ length: rowCount }, (_, idx) => {
    const productsoort = getVal(sheetsData, idx, productsoortRef);
    const eenheid = PRODUCTSOORT_TO_EENHEID[productsoort] ?? DEFAULT_EENHEID;
    const artikelgroep = PRODUCTSOORT_TO_ARTIKELGROEP[productsoort] ?? DEFAULT_ARTIKELGROEP;

    const omschrijvingRaw = omschrijvingRefs
      .map(ref => getVal(sheetsData, idx, ref))
      .filter(Boolean)
      .join(' ');

    const productnaamRaw = productnaamRefs
      .map(ref => getVal(sheetsData, idx, ref))
      .filter(Boolean)
      .join(' ');

    const bestelnummer = getVal(sheetsData, idx, bestelnummerRef);
    const geslachtVal = getVal(sheetsData, idx, geslachtRef);
    const geslacht = geslachtRef.col ? (geslachtVal || 'Unisex') : 'Unisex';

    return {
      'Code': startingCode + idx + 1,
      'Actief vanaf': activiefVanaf,
      'Omschrijving': omschrijvingRaw.slice(0, 60),
      'Extra omschrijving': omschrijvingRaw,
      'Artikelgroep: Omschrijving': artikelgroep,
      'Barcode': getVal(sheetsData, idx, barcodeRef),
      'Productsoort': productsoort,
      'Inkoop': 'Ja',
      'Ordergestuurd': 'Ja',
      'Verkoop': 'Ja',
      'Voorraad': 'Ja',
      'Eenheid': eenheid,
      'Btw-code: Verkoop': '2',
      'Kostprijs': getVal(sheetsData, idx, kostprijsRef),
      'Inkoopeenheid': eenheid,
      'Eenheidsfactor': '1',
      'Bestelnummer leverancier': bestelnummer,
      'Verkoopprijs': getVal(sheetsData, idx, verkoopprijsRef),
      'Hoofdleverancier': hoofdleverancier,
      'Btw-code: Inkoop': btwInkoop,
      'Veiligheidsclassificatie': getVal(sheetsData, idx, veiligheidsclassificatieRef),
      '2026 Controle JW': 'NG',
      'Geslacht': geslacht,
      'Maat': getVal(sheetsData, idx, maatRef),
      'Merk': getVal(sheetsData, idx, merkRef),
      'KMS Synchronisatie': 'Ja',
      'Kleur': (() => { const v = getVal(sheetsData, idx, kleurRef); return kleurMapping[v] ?? v; })(),
      'Productnaam': productnaamRaw,
      'Artikelcode': getVal(sheetsData, idx, artikelcodeRef),
      'Artikelcode Hoofdleverancier zoekveld': bestelnummer,
    };
  });
}
