import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth } from "date-fns";
import { analyzeFinances, answerQuestion } from "@/lib/ai-analysis";
import { normalizeMerchant } from "@/lib/category-rules";

/**
 * AI chat backed by a real LLM (free-tier, zero cost) with TOOL USE — the
 * assistant can perform real tasks for the client (add transactions, create
 * goals, set budgets, create recurring entries), all scoped to the user.
 *
 * Configure via env (OpenAI-compatible; defaults to Groq free tier):
 *   LLM_API_KEY, LLM_BASE_URL (default Groq), LLM_MODEL (default llama-3.3-70b-versatile)
 * Falls back to the rule-based engine when no key / on error.
 */

const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
const LLM_MODEL = process.env.LLM_MODEL || "llama-3.3-70b-versatile";
const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ClientMsg = { role: "user" | "ai" | "assistant" | "system"; content: string };
type ToolCall = { id: string; type?: string; function: { name: string; arguments: string } };
/* eslint-disable @typescript-eslint/no-explicit-any */
type LLMMessage = { role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string; name?: string };

const SYSTEM_PROMPT = `Você é a "FinanceAI", consultora financeira pessoal do FinanceOS — app brasileiro de controle financeiro. Conversa em português do Brasil, tom acolhedor, direto e prático.

Você pode CONVERSAR e também EXECUTAR TAREFAS para o cliente usando as ferramentas disponíveis:
- registrar transações (entradas/saídas)
- criar metas e adicionar valores a metas
- definir orçamento mensal por categoria
- criar lançamentos recorrentes (salário, aluguel, assinaturas)
- criar categorias novas
- classificar/recategorizar transações existentes por palavra-chave (ex: "põe todos os pix do Facebook na categoria Meta Ads")
- consultar/buscar as transações reais (search_transactions) para responder perguntas sobre lançamentos específicos, pessoas, estabelecimentos ou períodos

Regras:
- Quando o cliente pedir uma ação, USE a ferramenta apropriada em vez de só explicar. Nunca responda com um resumo genérico quando a pessoa pediu uma tarefa.
- Para pedidos compostos, encadeie ferramentas: ex. "crie a categoria Meta Ads e jogue os pix do facebook nela" = chame create_category e depois categorize_transactions.
- Para perguntas sobre transações específicas (ex: "pix para Evelyn na sexta", "quanto gastei no Uber"), USE search_transactions e responda com base no resultado. Resolva datas relativas ("sexta", "ontem", "este mês") usando a data de hoje informada no contexto.
- Após executar, confirme em 1-2 frases o que foi feito (quantidade afetada, valores).
- Se faltar uma informação essencial (ex: valor), pergunte antes de executar.
- Use os dados financeiros reais do contexto. Nunca invente números.
- Seja concisa. Cite valores em reais. Foque em finanças pessoais.
- Não prometa rentabilidade garantida.`;

function buildContext(
  a: Awaited<ReturnType<typeof analyzeFinances>>,
  goals: { title: string; targetAmount: number; currentAmount: number; deadline: Date | null }[],
  budgets: { name: string; amount: number; spent: number }[],
  categories: { name: string; type: string }[],
  accounts: { name: string; balance: number }[]
): string {
  const s = a.summary;
  const lines: string[] = [];
  lines.push("CONTEXTO — DADOS FINANCEIROS REAIS (mês atual):");
  if (accounts.length) lines.push("- Contas: " + accounts.map((ac) => `${ac.name} ${BRL(ac.balance)}`).join(", "));
  lines.push(`- Entradas: ${BRL(s.income)} | Saídas: ${BRL(s.expenses)} | Sobrou: ${BRL(s.savings)} (poupança ${s.savingsRate.toFixed(0)}%)`);
  lines.push(`- Saldo total: ${BRL(s.totalBalance)} | Média mensal: economiza ${BRL(s.avgMonthlySavings)}`);
  if (a.topCategories.length) lines.push("- Maiores gastos: " + a.topCategories.slice(0, 5).map((c) => `${c.name} ${BRL(c.amount)} (${c.pct}%)`).join(", "));
  if (a.pending.count > 0) lines.push(`- Pendentes: ${a.pending.count} (pagar ${BRL(a.pending.payable)}, receber ${BRL(a.pending.receivable)})`);
  if (goals.length) lines.push("- Metas: " + goals.map((g) => `${g.title} (${BRL(g.currentAmount)}/${BRL(g.targetAmount)})`).join("; "));
  if (budgets.length) lines.push("- Orçamentos: " + budgets.map((b) => `${b.name} ${BRL(b.spent)}/${BRL(b.amount)}`).join("; "));
  lines.push("- Categorias disponíveis: " + categories.map((c) => c.name).join(", "));
  if (!a.hasData) lines.push("- ATENÇÃO: poucas transações registradas. Incentive importar extrato ou adicionar lançamentos.");
  return lines.join("\n");
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "add_transaction",
      description: "Registra uma transação (entrada ou saída) para o usuário.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Descrição, ex: Mercado, Salário" },
          amount: { type: "number", description: "Valor positivo em reais" },
          type: { type: "string", enum: ["INCOME", "EXPENSE"], description: "INCOME=entrada, EXPENSE=saída" },
          date: { type: "string", description: "Data YYYY-MM-DD. Padrão: hoje" },
          category: { type: "string", description: "Nome da categoria (opcional)" },
        },
        required: ["title", "amount", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_goal",
      description: "Cria uma meta financeira.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          target_amount: { type: "number", description: "Valor alvo em reais" },
          current_amount: { type: "number", description: "Valor já guardado (opcional)" },
          deadline: { type: "string", description: "Prazo YYYY-MM-DD (opcional)" },
        },
        required: ["title", "target_amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_goal",
      description: "Adiciona um valor a uma meta existente (pelo nome).",
      parameters: {
        type: "object",
        properties: { goal: { type: "string", description: "Nome da meta" }, amount: { type: "number" } },
        required: ["goal", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_budget",
      description: "Define ou atualiza o orçamento (limite) mensal de uma categoria de despesa.",
      parameters: {
        type: "object",
        properties: { category: { type: "string", description: "Nome da categoria de despesa" }, monthly_limit: { type: "number" } },
        required: ["category", "monthly_limit"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_recurring",
      description: "Cria um lançamento recorrente (ex: salário mensal, aluguel, assinatura).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          amount: { type: "number" },
          type: { type: "string", enum: ["INCOME", "EXPENSE"] },
          frequency: { type: "string", enum: ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"], description: "Padrão: MONTHLY" },
          category: { type: "string", description: "Nome da categoria (opcional)" },
        },
        required: ["title", "amount", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_transactions",
      description: "Consulta as transações reais do usuário para responder perguntas (ex: 'pix para Evelyn na sexta', 'meus gastos com Uber', 'entradas de maio'). Use sempre que a pergunta envolver transações específicas, datas, pessoas ou estabelecimentos.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto buscado na descrição (pessoa, estabelecimento, palavra). Opcional." },
          type: { type: "string", enum: ["INCOME", "EXPENSE"], description: "Filtrar entradas ou saídas (opcional)" },
          from: { type: "string", description: "Data inicial YYYY-MM-DD (opcional)" },
          to: { type: "string", description: "Data final YYYY-MM-DD (opcional)" },
          limit: { type: "number", description: "Máximo de resultados (padrão 20, máx 50)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_category",
      description: "Cria uma nova categoria de transação. Use antes de classificar se a categoria não existir.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nome da categoria, ex: Meta Ads" },
          type: { type: "string", enum: ["INCOME", "EXPENSE", "BOTH"], description: "Tipo. Padrão: EXPENSE" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "categorize_transactions",
      description: "Classifica/recategoriza em massa as transações existentes cuja descrição contém uma palavra-chave. Ex: jogar todos os pix do Facebook na categoria 'Meta Ads'.",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string", description: "Palavra-chave buscada na descrição da transação, ex: facebook" },
          category: { type: "string", description: "Nome da categoria de destino (deve existir; crie antes se preciso)" },
          type: { type: "string", enum: ["INCOME", "EXPENSE"], description: "Filtrar só entradas ou só saídas (opcional)" },
        },
        required: ["match", "category"],
      },
    },
  },
];

type Cat = { id: string; name: string; type: string };

function resolveCategory(name: string | undefined, type: "INCOME" | "EXPENSE", cats: Cat[]): Cat | null {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  return (
    cats.find((c) => c.name.toLowerCase() === n && (c.type === type || c.type === "BOTH")) ||
    cats.find((c) => c.name.toLowerCase().includes(n) && (c.type === type || c.type === "BOTH")) ||
    cats.find((c) => n.includes(c.name.toLowerCase()) && (c.type === type || c.type === "BOTH")) ||
    null
  );
}

async function executeTool(name: string, args: any, userId: string, cats: Cat[]): Promise<{ result: string; changed: boolean }> {
  try {
    if (name === "add_transaction") {
      const amount = Number(args.amount);
      if (!args.title || !amount || amount <= 0) return { result: "Erro: informe descrição e valor válido.", changed: false };
      const type = args.type === "INCOME" ? "INCOME" : "EXPENSE";
      const date = args.date && /^\d{4}-\d{2}-\d{2}/.test(args.date) ? new Date(args.date) : new Date();
      const isFuture = date > new Date(new Date().toDateString());
      const cat = resolveCategory(args.category, type, cats);
      await db.transaction.create({
        data: { title: String(args.title), amount, type, date, status: isFuture ? "PENDING" : "COMPLETED", categoryId: cat?.id ?? null, userId, tags: [] },
      });
      return { result: `OK: ${type === "INCOME" ? "entrada" : "saída"} "${args.title}" de ${BRL(amount)} em ${date.toLocaleDateString("pt-BR")}${cat ? ` (categoria ${cat.name})` : ""}.`, changed: true };
    }

    if (name === "create_goal") {
      const target = Number(args.target_amount);
      if (!args.title || !target || target <= 0) return { result: "Erro: informe título e valor da meta.", changed: false };
      await db.goal.create({
        data: {
          title: String(args.title), targetAmount: target, currentAmount: Number(args.current_amount) || 0,
          deadline: args.deadline && /^\d{4}-\d{2}-\d{2}/.test(args.deadline) ? new Date(args.deadline) : null,
          type: "SAVINGS", color: "#10b981", icon: "🎯", userId,
        },
      });
      return { result: `OK: meta "${args.title}" criada (alvo ${BRL(target)}).`, changed: true };
    }

    if (name === "add_to_goal") {
      const amount = Number(args.amount);
      if (!amount || amount <= 0) return { result: "Erro: valor inválido.", changed: false };
      const g = await db.goal.findFirst({ where: { userId, title: { contains: String(args.goal ?? ""), mode: "insensitive" } } });
      if (!g) return { result: `Erro: não encontrei a meta "${args.goal}".`, changed: false };
      const newCurrent = g.currentAmount + amount;
      await db.goal.update({ where: { id: g.id }, data: { currentAmount: newCurrent, isCompleted: newCurrent >= g.targetAmount } });
      return { result: `OK: ${BRL(amount)} adicionados à meta "${g.title}" (agora ${BRL(newCurrent)}/${BRL(g.targetAmount)})${newCurrent >= g.targetAmount ? " — meta concluída! 🏆" : ""}.`, changed: true };
    }

    if (name === "set_budget") {
      const limit = Number(args.monthly_limit);
      if (!limit || limit <= 0) return { result: "Erro: limite inválido.", changed: false };
      const cat = resolveCategory(args.category, "EXPENSE", cats);
      if (!cat) return { result: `Erro: categoria "${args.category}" não encontrada. Categorias: ${cats.filter((c) => c.type !== "INCOME").map((c) => c.name).join(", ")}.`, changed: false };
      const existing = await db.budget.findFirst({ where: { userId, categoryId: cat.id } });
      if (existing) await db.budget.update({ where: { id: existing.id }, data: { amount: limit } });
      else await db.budget.create({ data: { userId, categoryId: cat.id, amount: limit, period: "MONTHLY" } });
      return { result: `OK: orçamento de ${cat.name} definido em ${BRL(limit)}/mês.`, changed: true };
    }

    if (name === "create_recurring") {
      const amount = Number(args.amount);
      if (!args.title || !amount || amount <= 0) return { result: "Erro: informe descrição e valor.", changed: false };
      const type = args.type === "INCOME" ? "INCOME" : "EXPENSE";
      const freq = ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"].includes(args.frequency) ? args.frequency : "MONTHLY";
      const cat = resolveCategory(args.category, type, cats);
      const today = new Date();
      await db.recurringTransaction.create({
        data: { title: String(args.title), amount, type, frequency: freq, categoryId: cat?.id ?? null, userId, startDate: today, nextDueDate: today, isActive: true },
      });
      return { result: `OK: recorrência "${args.title}" de ${BRL(amount)} (${freq}) criada.`, changed: true };
    }

    if (name === "search_transactions") {
      const where: Record<string, unknown> = { userId };
      if (args.query) where.title = { contains: String(args.query), mode: "insensitive" };
      if (args.type === "INCOME" || args.type === "EXPENSE") where.type = args.type;
      const from = args.from && /^\d{4}-\d{2}-\d{2}/.test(args.from) ? new Date(args.from + "T00:00:00") : null;
      const to = args.to && /^\d{4}-\d{2}-\d{2}/.test(args.to) ? new Date(args.to + "T23:59:59") : null;
      if (from || to) where.date = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
      const txs = await db.transaction.findMany({
        where, include: { category: { select: { name: true } } }, orderBy: { date: "desc" }, take: limit,
      });
      if (txs.length === 0) return { result: "Nenhuma transação encontrada com esses filtros.", changed: false };
      const sum = txs.reduce((a, t) => a + (t.type === "INCOME" ? t.amount : -t.amount), 0);
      const lines = txs.map((t) => `${new Date(t.date).toLocaleDateString("pt-BR")} · ${t.title} · ${t.type === "INCOME" ? "+" : "-"}${BRL(t.amount)} · ${t.category?.name ?? "Sem categoria"}${t.status === "PENDING" ? " · PENDENTE" : t.status === "CANCELLED" ? " · CANCELADO" : ""}`);
      return { result: `${txs.length} transação(ões) encontrada(s) (saldo líquido ${BRL(sum)}):\n` + lines.join("\n"), changed: false };
    }

    if (name === "create_category") {
      const cname = String(args.name ?? "").trim();
      if (!cname) return { result: "Erro: informe o nome da categoria.", changed: false };
      const type = ["INCOME", "EXPENSE", "BOTH"].includes(args.type) ? args.type : "EXPENSE";
      const existing = cats.find((c) => c.name.toLowerCase() === cname.toLowerCase());
      if (existing) return { result: `A categoria "${existing.name}" já existe.`, changed: false };
      const created = await db.category.create({
        data: { name: cname, type, icon: "🏷️", color: "#6366f1", userId },
        select: { id: true, name: true, type: true },
      });
      cats.push(created); // make it resolvable within this same conversation turn
      return { result: `OK: categoria "${created.name}" (${type === "INCOME" ? "entrada" : type === "BOTH" ? "ambos" : "saída"}) criada.`, changed: true };
    }

    if (name === "categorize_transactions") {
      const match = String(args.match ?? "").trim();
      if (!match) return { result: "Erro: informe a palavra-chave para buscar.", changed: false };
      const cat = cats.find((c) => c.name.toLowerCase() === String(args.category ?? "").toLowerCase())
        || cats.find((c) => c.name.toLowerCase().includes(String(args.category ?? "").toLowerCase()));
      if (!cat) return { result: `Erro: categoria "${args.category}" não existe. Crie-a primeiro com create_category.`, changed: false };
      const where: Record<string, unknown> = { userId, title: { contains: match, mode: "insensitive" } };
      if (args.type === "INCOME" || args.type === "EXPENSE") where.type = args.type;
      const result = await db.transaction.updateMany({ where, data: { categoryId: cat.id } });
      if (result.count === 0) return { result: `Nenhuma transação com "${match}" foi encontrada para classificar.`, changed: false };
      // Learn the rule so future imports auto-apply
      const pattern = normalizeMerchant(match);
      if (pattern.length >= 3) {
        await db.categoryRule.upsert({
          where: { userId_pattern: { userId, pattern } },
          create: { userId, pattern, categoryId: cat.id },
          update: { categoryId: cat.id },
        }).catch(() => {});
      }
      return { result: `OK: ${result.count} transação(ões) com "${match}" movida(s) para "${cat.name}". A partir de agora, novas importações com "${match}" entram nessa categoria automaticamente.`, changed: true };
    }

    return { result: `Erro: ferramenta desconhecida (${name}).`, changed: false };
  } catch (e) {
    console.error("[ai/chat tool]", name, e);
    return { result: "Erro ao executar a ação. Tente novamente.", changed: false };
  }
}

// Some Llama models on Groq occasionally emit tool calls in the wrong format
// (<function=name={...}</function>), which Groq rejects with tool_use_failed.
// Recover the intended call from the error's failed_generation.
function parseFailedToolCalls(errBody: string): { name: string; args: any }[] {
  let failed = "";
  try { failed = JSON.parse(errBody)?.error?.failed_generation ?? ""; } catch { failed = errBody; }
  if (!failed) return [];
  const calls: { name: string; args: any }[] = [];
  const re = /<function=([a-zA-Z_]+)[=>\s]*(\{[\s\S]*?\})\s*<\/function>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(failed)) !== null) {
    try { calls.push({ name: m[1], args: JSON.parse(m[2]) }); } catch { /* ignore */ }
  }
  return calls;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const history: ClientMsg[] = Array.isArray(body.messages) ? body.messages : [];
  const lastUser = body.message ?? [...history].reverse().find((m) => m.role === "user")?.content ?? "";

  const analysis = await analyzeFinances(userId);
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey) return NextResponse.json({ answer: answerQuestion(lastUser, analysis), engine: "rules", changed: false });

  try {
    const now = new Date();
    const [goalRows, budgetRows, monthExpenses, catRows, accountRows] = await Promise.all([
      db.goal.findMany({ where: { userId, isCompleted: false }, take: 8, select: { title: true, targetAmount: true, currentAmount: true, deadline: true } }),
      db.budget.findMany({ where: { userId }, include: { category: { select: { name: true } } } }),
      db.transaction.groupBy({ by: ["categoryId"], where: { userId, type: "EXPENSE", status: "COMPLETED", date: { gte: startOfMonth(now), lte: endOfMonth(now) } }, _sum: { amount: true } }),
      db.category.findMany({ where: { userId }, select: { id: true, name: true, type: true } }),
      db.financialAccount.findMany({ where: { userId, isActive: true }, select: { name: true, balance: true } }),
    ]);
    const spentByCat: Record<string, number> = {};
    for (const r of monthExpenses) if (r.categoryId) spentByCat[r.categoryId] = r._sum.amount ?? 0;
    const budgets = budgetRows.map((b) => ({ name: b.category?.name ?? "Categoria", amount: b.amount, spent: b.categoryId ? spentByCat[b.categoryId] ?? 0 : 0 }));
    const todayStr = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    const todayISO = now.toISOString().slice(0, 10);
    const context = `Hoje é ${todayStr} (ISO ${todayISO}).\n` + buildContext(analysis, goalRows, budgets, catRows, accountRows);

    const convo = history
      .map((m) => ({ role: m.role === "ai" ? "assistant" : m.role, content: String(m.content ?? "") }))
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim())
      .slice(-12);
    if (!convo.length) convo.push({ role: "user", content: lastUser || "Olá" });

    const messages: LLMMessage[] = [{ role: "system", content: `${SYSTEM_PROMPT}\n\n${context}` }, ...convo];

    let changed = false;
    let finalText = "";

    // Tool-use loop (bounded)
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: LLM_MODEL, messages, tools: TOOLS, tool_choice: "auto", max_tokens: 900, temperature: 0.3 }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        // Recover malformed tool calls (Groq tool_use_failed)
        const salvaged = parseFailedToolCalls(errText);
        if (salvaged.length) {
          const results: string[] = [];
          for (const { name, args } of salvaged) {
            const { result, changed: c } = await executeTool(name, args, userId, catRows);
            if (c) changed = true;
            results.push(`[${name}] ${result}`);
          }
          messages.push({ role: "assistant", content: "Resultado das ações/consultas:\n" + results.join("\n") });
          messages.push({ role: "user", content: "Com base nesses resultados, responda minha mensagem anterior de forma concisa, em português, citando os valores." });
          const res2 = await fetch(`${LLM_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: LLM_MODEL, messages, max_tokens: 700, temperature: 0.4 }),
          });
          if (res2.ok) {
            const d2 = await res2.json();
            finalText = (d2?.choices?.[0]?.message?.content ?? "").trim();
          }
          if (!finalText) finalText = changed ? results.join(" ") : results.join("\n");
          break;
        }
        console.error("[ai/chat] provider", res.status, errText);
        return NextResponse.json({ answer: answerQuestion(lastUser, analysis), engine: "rules-fallback", changed });
      }
      const data = await res.json();
      const msg = data?.choices?.[0]?.message as LLMMessage | undefined;
      if (!msg) break;

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        finalText = (msg.content ?? "").trim();
        break;
      }

      // Append the assistant tool-call message, then execute each tool
      messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls });
      for (const tc of toolCalls) {
        let parsed: any = {};
        try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch {}
        const { result, changed: c } = await executeTool(tc.function.name, parsed, userId, catRows);
        if (c) changed = true;
        messages.push({ role: "tool", tool_call_id: tc.id, name: tc.function.name, content: result });
      }
    }

    if (!finalText) finalText = changed ? "Pronto, tarefa concluída!" : answerQuestion(lastUser, analysis);
    return NextResponse.json({ answer: finalText, engine: "llm", changed });
  } catch (err) {
    console.error("[ai/chat]", err);
    return NextResponse.json({ answer: answerQuestion(lastUser, analysis), engine: "rules-fallback", changed: false });
  }
}
