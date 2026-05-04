import {
  PRODUCTSOORT_TO_ARTIKELGROEP,
  PRODUCTSOORT_TO_EENHEID,
  DEFAULT_ARTIKELGROEP,
  DEFAULT_EENHEID,
} from '../constants/converterMappings';
import type { ParsedFile } from '../types';

export interface ConverterArgs {
  supplFile: ParsedFile;
  startingCode: number;
  hoofdleverancier: string;
  btwInkoop: string;
  barcodeCol: string;
  productsoortCol: string;
  kostprijsCol: string;
  bestelnummerCol: string;
  verkoopprijsCol: string;
  veiligheidsclassificatieCol: string;
  geslachtCol: string;
  maatCol: string;
  merkCol: string;
  kleurCol: string;
  artikelcodeCol: string;
  omschrijvingCols: string[];
  productnaamCols: string[];
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
  const d = '01';
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}-${m}-${y}`;
}

function col(row: Record<string, unknown>, key: string): string {
  return key ? String(row[key] ?? '').trim() : '';
}

export function buildOutputRows(args: ConverterArgs): Record<string, unknown>[] {
  const {
    supplFile,
    startingCode,
    hoofdleverancier,
    btwInkoop,
    barcodeCol,
    productsoortCol,
    kostprijsCol,
    bestelnummerCol,
    verkoopprijsCol,
    veiligheidsclassificatieCol,
    geslachtCol,
    maatCol,
    merkCol,
    kleurCol,
    artikelcodeCol,
    omschrijvingCols,
    productnaamCols,
  } = args;

  const activiefVanaf = firstOfCurrentMonth();

  return supplFile.data.map((row, idx) => {
    const productsoort = col(row, productsoortCol);
    const eenheid = PRODUCTSOORT_TO_EENHEID[productsoort] ?? DEFAULT_EENHEID;
    const artikelgroep = PRODUCTSOORT_TO_ARTIKELGROEP[productsoort] ?? DEFAULT_ARTIKELGROEP;

    const omschrijvingRaw = omschrijvingCols
      .map(c => col(row, c))
      .filter(Boolean)
      .join(' ');

    const productnaamRaw = productnaamCols
      .map(c => col(row, c))
      .filter(Boolean)
      .join(' ');

    const bestelnummer = col(row, bestelnummerCol);
    const geslacht = geslachtCol ? (col(row, geslachtCol) || 'Unisex') : 'Unisex';

    return {
      'Code': startingCode + idx + 1,
      'Actief vanaf': activiefVanaf,
      'Omschrijving': omschrijvingRaw.slice(0, 60),
      'Extra omschrijving': omschrijvingRaw,
      'Artikelgroep: Omschrijving': artikelgroep,
      'Barcode': col(row, barcodeCol),
      'Productsoort': productsoort,
      'Inkoop': 'Ja',
      'Ordergestuurd': 'Ja',
      'Verkoop': 'Ja',
      'Voorraad': 'Ja',
      'Eenheid': eenheid,
      'Btw-code: Verkoop': '2',
      'Kostprijs': col(row, kostprijsCol),
      'Inkoopeenheid': eenheid,
      'Eenheidsfactor': '1',
      'Bestelnummer leverancier': bestelnummer,
      'Verkoopprijs': col(row, verkoopprijsCol),
      'Hoofdleverancier': hoofdleverancier,
      'Btw-code: Inkoop': btwInkoop,
      'Veiligheidsclassificatie': col(row, veiligheidsclassificatieCol),
      '2026 Controle JW': 'NG',
      'Geslacht': geslacht,
      'Maat': col(row, maatCol),
      'Merk': col(row, merkCol),
      'KMS Synchronisatie': 'Ja',
      'Kleur': col(row, kleurCol),
      'Productnaam': productnaamRaw,
      'Artikelcode': col(row, artikelcodeCol),
      'Artikelcode Hoofdleverancier zoekveld': bestelnummer,
    };
  });
}
