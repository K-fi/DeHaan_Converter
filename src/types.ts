import type { WorkSheet, WorkBook } from 'xlsx';

export interface ColRef {
  sheet: string;
  col: string;
}

export interface ParsedFile {
  data: Record<string, unknown>[];
  cols: string[];
  rawSheet: WorkSheet;
  workbook: WorkBook;
  fileName: string;
  sheetName: string;
}

export interface BannerInfo {
  type: 'success' | 'warning' | 'info';
  icon: string;
  message: string;
}

export interface ReportRow extends Record<string, unknown> {
  EAN: string;
  ArticleCode: string;
  OldPrice: unknown;
  NewPrice: unknown;
  ActiveFrom: string;
  ActiveTo: string;
  Status: 'Updated' | 'Not matched';
  MatchedBy: string;
}

export interface UnmatchedRow {
  ean: string;
  code: string;
  oldPrice: unknown;
  exactRow: Record<string, unknown>;
}

export interface DupeOccurrence {
  price: unknown;
  row: Record<string, unknown>;
}

export interface MatchResults {
  updated: number;
  total: number;
  resultData: Record<string, unknown>[];
  resultCols: string[];
  reportRows: ReportRow[];
  unmatched: UnmatchedRow[];
  dupeData: Record<string, unknown>[];
  dupesList: [string, number][];
  usedDupeEans: string[];
  nullEanData: Record<string, unknown>[];
  nullEanExactData: Record<string, unknown>[];
  resultPreviewCols: string[];
  resultPreviewData: Record<string, unknown>[];
}

export interface MatchArgs {
  eEanCol: string;
  eCodeCol: string;
  ePriceCol: string;
  fromValue: string;
  toValue: string;
}

export interface PriceUpdaterMappings {
  exactEan: string;
  exactCode: string;
  exactPrice: string;
  exactEanSheet: string;
  exactCodeSheet: string;
  exactPriceSheet: string;
  supplEan: string;
  supplExtraEans: string[];
  supplCode: string;
  supplPrice: string;
  supplEanSheet: string;
  supplCodeSheet: string;
  supplPriceSheet: string;
  priceType: string;
}

export interface SupplierConverterMappings {
  hoofdleverancier: string;
  btwInkoop: string;
  barcodeRef: ColRef;
  productsoortRef: ColRef;
  kostprijsRef: ColRef;
  bestelnummerRef: ColRef;
  verkoopprijsRef: ColRef;
  maatRef: ColRef;
  kleurRef: ColRef;
  kleurMapping: Record<string, string>;
  veiligheidsclassRef: ColRef;
  geslachtRef: ColRef;
  merkRef: ColRef;
  artikelcodeRef: ColRef;
  omschrijvingRefs: ColRef[];
  productnaamRefs: ColRef[];
}

export interface Preset {
  id: string;
  name: string;
  tool: 'price_updater' | 'supplier_converter';
  mappings: Record<string, unknown>;
  created_at: string;
}

export interface AutoDetected {
  eEan?: string | null;
  eCode?: string | null;
  ePrice?: string | null;
  sEan?: string | null;
  sCode?: string | null;
  sPrice?: string | null;
}
