export const EAN_HINTS   = ['ean','barcode','gtin','ean13','ean_code','barcodenr','streepjescode','barcodeno','gtinnumber'];
export const PRICE_HINTS = ['price','prijs','inkoop','verkoop','purchase','selling','unitprice','nettoprice','netto','stukprijs','listprice','salesprice','purchaseprice'];
export const CODE_HINTS  = ['article','artikelcode','code','sku','item','productnr','productcode','artnr','itemcode','itemnr','itemno','artikelnr'];
export const DESC_HINTS  = ['description','descri','omschrijving','omschrijv','name','titel','title','product'];
export const UNIT_HINTS  = ['unit','eenheid','units','u'];
export const CURR_HINTS  = ['currency','curr','munt','eur','€'];
export const FROM_HINTS  = ['activefrom','active_from','ingangsdatum','startdate','startdatum','geldigvan','validfrom','datefrom'];
export const TO_HINTS    = ['activeto','active_to','einddatum','enddate','geldigtot','validto','validuntil','dateto'];
export const ALL_HINTS   = [...EAN_HINTS, ...PRICE_HINTS, ...CODE_HINTS, ...DESC_HINTS, ...UNIT_HINTS, ...CURR_HINTS, ...FROM_HINTS, ...TO_HINTS];

export function findBestCol(
  cols: string[],
  data: Record<string, unknown>[],
  hints: string[],
  test: ((v: unknown) => boolean) | null,
): string | null {
  for (const hint of hints)
    for (const col of cols)
      if (col.toLowerCase().replace(/[\s_-]/g, '').includes(hint)) return col;
  if (test && data.length)
    for (const col of cols) {
      let hits = 0;
      for (let i = 0; i < Math.min(data.length, 20); i++)
        if (test(data[i][col])) hits++;
      if (hits >= Math.min(3, data.length)) return col;
    }
  return null;
}
