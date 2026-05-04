// Fill these lookup tables with the business to match actual Productsoort values.
// Keys are the exact Productsoort strings that appear in supplier files.

export const PRODUCTSOORT_TO_ARTIKELGROEP: Record<string, string> = {
  // Examples — replace/extend with real mappings:
  // 'Schoen':        'Schoenen',
  // 'Sandaal':       'Schoenen',
  // 'Laars':         'Schoenen',
  // 'Accessoire':    'Accessoires',
};

export const PRODUCTSOORT_TO_EENHEID: Record<string, string> = {
  // Examples — replace/extend with real mappings:
  // 'Schoen':        'Paar',
  // 'Sandaal':       'Paar',
  // 'Laars':         'Paar',
  // 'Accessoire':    'Stuk',
};

export const DEFAULT_ARTIKELGROEP = '';
export const DEFAULT_EENHEID = 'Paar';
