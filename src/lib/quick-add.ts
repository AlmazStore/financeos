import { guessCategoryId } from "./statement-parser";

export type QuickParsed = {
  title: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string; // ISO yyyy-mm-dd
  categoryId: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

function parseMoney(s: string): number {
  let v = s.trim();
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  return parseFloat(v) || 0;
}

const INCOME_WORDS = ["entrada", "recebi", "recebido", "salario", "salário", "ganhei", "receita", "recebimento", "freela", "freelance", "pix recebido", "vendi", "venda"];

/**
 * Parses a quick-add phrase into a transaction.
 * Examples: "uber 32", "mercado 85,50 ontem", "salário 5000 entrada", "aluguel 1200 05/06"
 */
export function parseQuickAdd(
  text: string,
  categories: { id: string; name: string; type: string }[]
): QuickParsed {
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // amount (first money-like token)
  const moneyMatch = lower.match(/(\d{1,3}(?:\.\d{3})+,\d{1,2}|\d+,\d{1,2}|\d+\.\d{2}|\d+)/);
  const amountToken = moneyMatch?.[0] ?? "";
  const amount = amountToken ? parseMoney(amountToken) : 0;

  // type
  const type: "INCOME" | "EXPENSE" = INCOME_WORDS.some((w) => lower.includes(w)) ? "INCOME" : "EXPENSE";

  // date
  const date = new Date();
  if (/\banteontem\b/.test(lower)) date.setDate(date.getDate() - 2);
  else if (/\bontem\b/.test(lower)) date.setDate(date.getDate() - 1);
  else {
    const dm = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (dm) {
      const d = +dm[1], m = +dm[2];
      let y = dm[3] ? +dm[3] : date.getFullYear();
      if (y < 100) y += 2000;
      const parsed = new Date(y, m - 1, d);
      if (!isNaN(parsed.getTime())) { date.setTime(parsed.getTime()); }
    }
  }
  const dateISO = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  // title (strip amount, currency, date words/tokens, type words)
  let title = raw
    .replace(amountToken, "")
    .replace(/r\$/gi, "")
    .replace(/\b(hoje|ontem|anteontem)\b/gi, "")
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, "")
    .replace(/\b(entrada|recebi|recebido|ganhei|receita|recebimento)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (title) title = title.charAt(0).toUpperCase() + title.slice(1);

  const categoryId = guessCategoryId(raw, type, categories);
  if (!title) {
    title = categories.find((c) => c.id === categoryId)?.name ?? (type === "INCOME" ? "Entrada" : "Despesa");
  }

  return { title, amount, type, date: dateISO, categoryId };
}
