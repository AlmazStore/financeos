// Bank statement parser — supports OFX and CSV (common Brazilian bank formats)

export type ParsedTx = {
  date: string;        // ISO yyyy-mm-dd
  description: string;
  amount: number;      // always positive
  type: "INCOME" | "EXPENSE";
  fitid?: string;      // bank's unique transaction id (OFX), when available
};

/**
 * Stable fingerprint used to deduplicate transactions across repeated imports.
 * Prefers the bank's FITID; otherwise hashes date + amount + type + description.
 * Must produce identical output on client and server.
 */
export function transactionHash(tx: {
  date: string; amount: number; type: string; description: string; fitid?: string;
}): string {
  if (tx.fitid && tx.fitid.trim()) return `fit:${tx.fitid.trim()}`;
  return fallbackHash(tx);
}

/**
 * Field-based fingerprint (ignores FITID). Used to detect duplicates against
 * transactions that were created before importHash existed, or that came from
 * a different source/format.
 */
export function fallbackHash(tx: {
  date: string; amount: number; type: string; description: string;
}): string {
  const norm = tx.description.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 40);
  return `h:${tx.date}|${tx.amount.toFixed(2)}|${tx.type}|${norm}`;
}

/** Detects cancelled transactions (e.g. "Pix cancelado", "Compra cancelada"). */
export function isCancelledDescription(description: string): boolean {
  return /cancelad[oa]/i.test(description);
}

/* -------------------- helpers -------------------- */

function toISODate(raw: string): string | null {
  const s = raw.trim();

  // OFX: YYYYMMDD (optionally followed by time/timezone)
  const ofx = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;

  // ISO: YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // BR: DD/MM/YYYY or DD/MM/YY  (also accepts - or .)
  const br = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (br) {
    let [, d, m, y] = br;
    if (y.length === 2) y = "20" + y;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

// Parse a money string that might be "1.234,56", "1234.56", "-1.234,56", "R$ 1.234,56", "1234,56"
function parseAmount(raw: string): number | null {
  let s = raw.replace(/r\$/i, "").replace(/\s/g, "").trim();
  if (!s) return null;

  const negative = /^-/.test(s) || /\)$/.test(s); // -x or (x)
  s = s.replace(/[()]/g, "").replace(/^-/, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Last separator is the decimal one
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", "."); // BR: 1.234,56
    } else {
      s = s.replace(/,/g, ""); // US: 1,234.56
    }
  } else if (hasComma) {
    s = s.replace(",", "."); // 1234,56
  }
  // else only dot or plain integer

  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -n : n;
}

/* -------------------- OFX -------------------- */

export function parseOFX(text: string): ParsedTx[] {
  const txs: ParsedTx[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);

  for (const block of blocks) {
    const amtMatch = block.match(/<TRNAMT>\s*([^<\r\n]+)/i);
    const dateMatch = block.match(/<DTPOSTED>\s*([^<\r\n]+)/i);
    const memoMatch = block.match(/<MEMO>\s*([^<\r\n]+)/i);
    const nameMatch = block.match(/<NAME>\s*([^<\r\n]+)/i);
    const fitMatch = block.match(/<FITID>\s*([^<\r\n]+)/i);

    if (!amtMatch || !dateMatch) continue;

    const amount = parseAmount(amtMatch[1]);
    const date = toISODate(dateMatch[1]);
    if (amount === null || date === null || amount === 0) continue;

    const description = (memoMatch?.[1] ?? nameMatch?.[1] ?? "Transação").trim();

    txs.push({
      date,
      description,
      amount: Math.abs(amount),
      type: amount < 0 ? "EXPENSE" : "INCOME",
      fitid: fitMatch?.[1]?.trim(),
    });
  }
  return txs;
}

/* -------------------- CSV -------------------- */

function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result.map((c) => c.trim().replace(/^"|"$/g, ""));
}

const DATE_HEADERS = ["data", "date", "dt"];
const DESC_HEADERS = ["descri", "histor", "lançamento", "lancamento", "title", "memo", "estabelecimento", "detalhe"];
const AMOUNT_HEADERS = ["valor", "amount", "value", "montante", "quantia"];

export function parseCSV(text: string): ParsedTx[] {
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) return [];

  // Detect delimiter from first line
  const first = rawLines[0];
  const delimiter = (first.split(";").length > first.split(",").length) ? ";" : ",";

  // Try to find header row among first 3 lines
  let headerIdx = -1;
  let cols: string[] = [];
  for (let i = 0; i < Math.min(3, rawLines.length); i++) {
    const c = splitCSVLine(rawLines[i], delimiter).map((x) => x.toLowerCase());
    if (c.some((h) => DATE_HEADERS.some((k) => h.includes(k))) &&
        c.some((h) => AMOUNT_HEADERS.some((k) => h.includes(k)))) {
      headerIdx = i;
      cols = c;
      break;
    }
  }

  let dateCol = -1, descCol = -1, amountCol = -1;
  if (headerIdx >= 0) {
    cols.forEach((h, idx) => {
      if (dateCol === -1 && DATE_HEADERS.some((k) => h.includes(k))) dateCol = idx;
      if (amountCol === -1 && AMOUNT_HEADERS.some((k) => h.includes(k))) amountCol = idx;
      if (descCol === -1 && DESC_HEADERS.some((k) => h.includes(k))) descCol = idx;
    });
  }

  const txs: ParsedTx[] = [];
  const startLine = headerIdx >= 0 ? headerIdx + 1 : 0;

  for (let i = startLine; i < rawLines.length; i++) {
    const fields = splitCSVLine(rawLines[i], delimiter);
    if (fields.length < 2) continue;

    let dateStr: string | null = null;
    let amount: number | null = null;
    let desc = "";

    if (headerIdx >= 0 && dateCol >= 0 && amountCol >= 0) {
      dateStr = toISODate(fields[dateCol] ?? "");
      amount = parseAmount(fields[amountCol] ?? "");
      desc = (descCol >= 0 ? fields[descCol] : fields.find((_, idx) => idx !== dateCol && idx !== amountCol)) ?? "";
    } else {
      // No header: detect columns positionally
      const dateField = fields.find((f) => toISODate(f) !== null);
      // amount = first field that parses as money and is not the date
      const amtField = fields.find((f) => f !== dateField && parseAmount(f) !== null && /\d/.test(f));
      dateStr = dateField ? toISODate(dateField) : null;
      amount = amtField ? parseAmount(amtField) : null;
      desc = fields.find((f) => f !== dateField && f !== amtField && f.length > 1 && !/^\d+[.,]?\d*$/.test(f)) ?? "Transação";
    }

    if (dateStr === null || amount === null || amount === 0) continue;

    txs.push({
      date: dateStr,
      description: (desc || "Transação").trim().slice(0, 120),
      amount: Math.abs(amount),
      type: amount < 0 ? "EXPENSE" : "INCOME",
    });
  }
  return txs;
}

/* -------------------- entry point -------------------- */

export function parseStatement(filename: string, content: string): ParsedTx[] {
  const lower = filename.toLowerCase();
  const looksOFX = lower.endsWith(".ofx") || /<OFX>|<STMTTRN>/i.test(content);
  if (looksOFX) return parseOFX(content);
  return parseCSV(content);
}

/* -------------------- category auto-detection -------------------- */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Alimentação": ["mercado", "supermerc", "ifood", "restaurante", "padaria", "lanchonete", "açai", "acai", "rappi", "hortifruti", "aliment", "food", "burger", "pizz"],
  "Transporte": ["uber", "99", "posto", "combustivel", "combustível", "gasolina", "estaciona", "metro", "metrô", "onibus", "ônibus", "passagem", "cabify", "ipva", "pedagio", "pedágio"],
  "Moradia": ["aluguel", "condominio", "condomínio", "energia", "luz", "enel", "cemig", "copel", "agua", "água", "sabesp", "internet", "vivo", "claro", "tim", "net ", "gas ", "iptu"],
  "Saúde": ["farmacia", "farmácia", "drogaria", "drogasil", "raia", "hospital", "clinica", "clínica", "consulta", "laboratorio", "laboratório", "academia", "smartfit", "plano de saude", "unimed"],
  "Assinaturas": ["netflix", "spotify", "amazon prime", "prime video", "hbo", "disney", "youtube premium", "globoplay", "deezer", "apple.com", "google ", "icloud", "office 365", "canva"],
  "Lazer": ["cinema", "ingresso", "show", "bar ", "balada", "steam", "playstation", "xbox", "nintendo", "viagem", "hotel", "airbnb", "booking"],
  "Educação": ["escola", "faculdade", "curso", "udemy", "alura", "livraria", "mensalidade", "colégio", "colegio"],
  "Salário": ["salario", "salário", "pagamento", "provento", "remuneracao", "remuneração", "folha"],
  "Freelance": ["freela", "freelance", "honorario", "honorário", "pix recebido", "transferencia recebida", "ted recebida"],
  "Investimentos": ["cdb", "tesouro", "aplicacao", "aplicação", "investimento", "renda fixa", "acoes", "ações", "fundo"],
};

/**
 * Given a transaction description and a list of the user's categories,
 * returns the best matching category id (or null).
 */
export function guessCategoryId(
  description: string,
  type: "INCOME" | "EXPENSE",
  categories: { id: string; name: string; type: string }[]
): string | null {
  const desc = description.toLowerCase();

  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => desc.includes(k))) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase() && (c.type === type || c.type === "BOTH")
      );
      if (match) return match.id;
    }
  }
  return null;
}
