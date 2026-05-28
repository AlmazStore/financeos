import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth } from "date-fns";
import { analyzeFinances, answerQuestion } from "@/lib/ai-analysis";

/**
 * AI chat backed by a real LLM with ZERO cost using a free-tier provider.
 *
 * Configure via env (any OpenAI-compatible endpoint works — Groq, Google
 * Gemini, OpenRouter, Together, etc.). Defaults target Groq's free tier:
 *   LLM_API_KEY   = your free key (e.g. Groq gsk_...)
 *   LLM_BASE_URL  = https://api.groq.com/openai/v1  (default)
 *   LLM_MODEL     = llama-3.3-70b-versatile        (default)
 *
 * Gemini free tier example:
 *   LLM_BASE_URL  = https://generativelanguage.googleapis.com/v1beta/openai
 *   LLM_MODEL     = gemini-2.0-flash
 *
 * If no key is set (or the call fails), it falls back to the built-in
 * rule-based engine so the app keeps working.
 */

const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
const LLM_MODEL = process.env.LLM_MODEL || "llama-3.3-70b-versatile";
const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ClientMsg = { role: "user" | "ai" | "assistant" | "system"; content: string };

const SYSTEM_PROMPT = `Você é a "FinanceAI", consultora financeira pessoal do FinanceOS — um app brasileiro de controle financeiro. Conversa em português do Brasil, com tom acolhedor, direto e prático, como um consultor experiente que torce pelo cliente.

Regras:
- Use SEMPRE os dados financeiros reais do usuário fornecidos no contexto. Nunca invente números; se faltar dado, peça para ele registrar/importar mais transações.
- Seja específica e acionável: cite valores em reais, percentuais e prazos concretos. Sugira próximos passos claros.
- Responda de forma concisa (2 a 5 frases na maioria das vezes). Use listas curtas quando ajudar.
- Foque em finanças pessoais (gastos, economia, orçamento, metas, dívidas, reserva, investimentos básicos, fluxo de caixa). Se perguntarem algo fora disso, redirecione gentilmente.
- Não prometa rentabilidade garantida nem recomende ativos específicos como certeza. Eduque e oriente.
- Incentive bons hábitos: registrar gastos a cada poucos dias, guardar ~20% da renda, montar reserva de emergência de 6 meses.
- Pode citar recursos do app quando útil: Transações, Importar Extrato, Orçamentos, Metas, Saúde Financeira, Relatórios, Recorrentes.`;

function buildContext(
  a: Awaited<ReturnType<typeof analyzeFinances>>,
  goals: { title: string; targetAmount: number; currentAmount: number; deadline: Date | null }[],
  budgets: { name: string; amount: number; spent: number }[]
): string {
  const s = a.summary;
  const lines: string[] = [];
  lines.push("CONTEXTO — DADOS FINANCEIROS REAIS DO USUÁRIO (mês atual):");
  lines.push(`- Entradas: ${BRL(s.income)} | Saídas: ${BRL(s.expenses)} | Sobrou: ${BRL(s.savings)} (taxa de poupança ${s.savingsRate.toFixed(0)}%)`);
  lines.push(`- Saldo total nas contas: ${BRL(s.totalBalance)}`);
  lines.push(`- Média mensal: economiza ${BRL(s.avgMonthlySavings)}, gasta ${BRL(s.avgMonthlyExpenses)}`);
  if (a.topCategories.length) {
    lines.push("- Maiores gastos do mês: " + a.topCategories.slice(0, 5).map((c) => `${c.name} ${BRL(c.amount)} (${c.pct}%)`).join(", "));
  }
  if (a.pending.count > 0) {
    lines.push(`- Contas pendentes: ${a.pending.count} (a pagar ${BRL(a.pending.payable)}, a receber ${BRL(a.pending.receivable)})`);
  }
  if (goals.length) {
    lines.push("- Metas: " + goals.map((g) => `${g.title} (${BRL(g.currentAmount)}/${BRL(g.targetAmount)}${g.deadline ? `, prazo ${new Date(g.deadline).toLocaleDateString("pt-BR")}` : ""})`).join("; "));
  }
  if (budgets.length) {
    lines.push("- Orçamentos: " + budgets.map((b) => `${b.name} ${BRL(b.spent)}/${BRL(b.amount)}`).join("; "));
  }
  if (!a.hasData) lines.push("- ATENÇÃO: o usuário ainda não tem transações suficientes. Incentive-o a importar o extrato ou adicionar lançamentos.");
  return lines.join("\n");
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

  // No key configured → deterministic rule-based engine (still useful, zero cost)
  if (!apiKey) {
    return NextResponse.json({ answer: answerQuestion(lastUser, analysis), engine: "rules" });
  }

  try {
    const now = new Date();
    const [goalRows, budgetRows, monthExpenses] = await Promise.all([
      db.goal.findMany({ where: { userId, isCompleted: false }, take: 8, select: { title: true, targetAmount: true, currentAmount: true, deadline: true } }),
      db.budget.findMany({ where: { userId }, include: { category: { select: { name: true } } } }),
      db.transaction.groupBy({
        by: ["categoryId"],
        where: { userId, type: "EXPENSE", status: "COMPLETED", date: { gte: startOfMonth(now), lte: endOfMonth(now) } },
        _sum: { amount: true },
      }),
    ]);
    const spentByCat: Record<string, number> = {};
    for (const r of monthExpenses) if (r.categoryId) spentByCat[r.categoryId] = r._sum.amount ?? 0;
    const budgets = budgetRows.map((b) => ({ name: b.category?.name ?? "Categoria", amount: b.amount, spent: b.categoryId ? spentByCat[b.categoryId] ?? 0 : 0 }));

    const context = buildContext(analysis, goalRows, budgetRows.length ? budgets : []);

    // Build OpenAI-compatible message list: system → trimmed history
    const convo = history
      .map((m) => ({ role: m.role === "ai" ? "assistant" : m.role, content: String(m.content ?? "") }))
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim())
      .slice(-12);
    if (!convo.length) convo.push({ role: "user", content: lastUser || "Olá" });

    const messages = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n${context}` },
      ...convo,
    ];

    const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: LLM_MODEL, messages, max_tokens: 800, temperature: 0.6 }),
    });

    if (!res.ok) {
      console.error("[ai/chat] provider error", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ answer: answerQuestion(lastUser, analysis), engine: "rules-fallback" });
    }

    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ answer: answer || answerQuestion(lastUser, analysis), engine: answer ? "llm" : "rules-fallback" });
  } catch (err) {
    console.error("[ai/chat]", err);
    return NextResponse.json({ answer: answerQuestion(lastUser, analysis), engine: "rules-fallback" });
  }
}
