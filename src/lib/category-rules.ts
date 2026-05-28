// Normalizes a transaction description into a stable "merchant key" used to
// remember category choices and auto-apply them on future imports.
export function normalizeMerchant(description: string): string {
  return description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/\d+/g, " ")            // drop numbers (card ids, dates)
    .replace(/[^a-z\s]/g, " ")       // drop symbols
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
}
