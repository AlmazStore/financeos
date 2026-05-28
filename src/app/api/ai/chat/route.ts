import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth } from "date-fns";
import { analyzeFinances, answerQuestion } from "@/lib/ai-analysis";

const MODEL = process.env.AI_CHAT_MODEL || "claude-opus-4-7";
const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type ClientMsg = { role: "user" | "ai" | "assistant"; content: string };

const SYSTEM_PROMPT = `Você é a "FinanceAI", a consultora financeira pessoal do FinanceOS — um app brasileiro de controle financeiro. Você conversa em português do Brasil, com tom acolhedor, direto e prático, como um consultor experiente que torce pelo cliente.

Suas regras:
- Use SEMPRE os dados financeiros reais do usuário fornecidos abaixo. Nunca invente números; se não tiver o dado, diga que ele precisa registrar mais transações.
- Seja específica e acionável: cite valores em reais, percentuais e prazos concretos. Sugira próximos passos claros.
- Responda de forma concisa (2 a 5 frases na maioria das vezes). Use listas curtas quando ajudar.
- Foque em finanças pessoais: gastos, economia, orçamento, metas, dívidas, investimentos básicos, fluxo de caixa. Se perguntarem algo fora disso, redirecione gentilmente.
- Não prometa rentabilidade garantida nem dê recomendação de ativos específicos como se fosse garantia. Eduque e oriente.
- Quando fizer sentido, incentive bons hábitos (registrar gastos a cada poucos dias, guardar 20%, montar reserva de emergência de 6 meses).
- Pode citar recursos do app quando útil: Transações, Importar Extrato, Orçamentos, Metas, Saúde Financeira, Relatórios, Recorrentes.`;

function buildContext(
  a: Awaited<ReturnType<typeof analyzeFinances>>,
  goals: { title: string; targetAmount: number; currentAmount: number; deadline: Date | null }[],
  budgets: { name: string; amount: number; spent: number }[]
): string {
  const s = a.summary;
  const lines: string[] = [];
  lines.push("DADOS FINANCEIROS REAIS DO USUÁRIO (mês atual):");
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
  if (!a.hasData) lines.push("- ATENÇÃO: o usuário ainda não registrou transações suficientes. Incentive-o a importar o extrato ou adicionar lançamentos.");
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

  // Fallback: no API key configured → deterministic rule-based engine
  if (!process.env.ANTHROPIC_API_KEY) {
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

    const context = buildContext(analysis, goalRows, budgets);

    // Build the conversation for Claude (only user/assistant, must start with user)
    const msgs = history
      .map((m) => ({ role: m.role === "ai" ? ("assistant" as const) : (m.role as "user" | "assistant"), content: String(m.content ?? "") }))
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim())
      .slice(-12);
    while (msgs.length && msgs[0].role !== "user") msgs.shift();
    if (!msgs.length) msgs.push({ role: "user", content: lastUser || "Olá" });

    const client = new Anthropic();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        { type: "text", text: context },
      ],
      messages: msgs,
    });

    const answer = resp.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n").trim();
    return NextResponse.json({ answer: answer || "Desculpe, não consegui responder agora.", engine: "claude" });
  } catch (err) {
    console.error("[ai/chat]", err);
    // Graceful fallback to the rule-based engine on any API error
    return NextResponse.json({ answer: answerQuestion(lastUser, analysis), engine: "rules-fallback" });
  }
}
