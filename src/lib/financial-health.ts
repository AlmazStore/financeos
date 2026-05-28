import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export type Indicator = {
  key: string;
  label: string;
  value: string;
  hint: string;
  status: "good" | "warning" | "bad" | "neutral";
  progress?: number; // 0-100 for a bar
};

export type Tip = {
  id: string;
  title: string;
  text: string;
  priority: "high" | "medium" | "low";
};

export type HealthResult = {
  hasData: boolean;
  score: number;            // 0-100
  rating: "Excelente" | "Boa" | "Atenção" | "Crítica";
  breakdown: { label: string; points: number; max: number }[];
  indicators: Indicator[];
  rule503020: { needs: number; wants: number; savings: number; needsPct: number; wantsPct: number; savingsPct: number };
  tips: Tip[];
  summary: { income: number; expenses: number; savings: number; savingsRate: number; totalBalance: number; emergencyMonths: number };
};

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const NEEDS_KEYWORDS = ["moradia", "aluguel", "aliment", "mercado", "supermerc", "saúde", "saude", "transporte", "educa", "conta", "luz", "água", "agua", "energia", "internet", "gás", "gas", "farm", "condom"];
const INVEST_KEYWORDS = ["invest", "cdb", "tesouro", "poupan", "ações", "acoes", "renda fixa", "fundo"];

function classify(name: string): "needs" | "invest" | "wants" {
  const n = name.toLowerCase();
  if (INVEST_KEYWORDS.some((k) => n.includes(k))) return "invest";
  if (NEEDS_KEYWORDS.some((k) => n.includes(k))) return "needs";
  return "wants";
}

export async function computeHealth(userId: string): Promise<HealthResult> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [monthTx, accounts, goals, prevTx] = await Promise.all([
    db.transaction.findMany({
      where: { userId, status: "COMPLETED", date: { gte: monthStart, lte: monthEnd } },
      include: { category: true },
    }),
    db.financialAccount.findMany({ where: { userId, isActive: true } }),
    db.goal.findMany({ where: { userId } }),
    db.transaction.findMany({
      where: { userId, status: "COMPLETED", date: { gte: startOfMonth(subMonths(now, 3)), lt: monthStart } },
      select: { type: true, amount: true, date: true },
    }),
  ]);

  const income = monthTx.filter((t) => t.type === "INCOME").reduce((a, b) => a + b.amount, 0);
  const expenses = monthTx.filter((t) => t.type === "EXPENSE").reduce((a, b) => a + b.amount, 0);
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  const totalBalance = accounts.reduce((a, b) => a + b.balance, 0);

  // Average monthly expenses over previous 3 months (fallback to current)
  const prevMonths = [1, 2, 3].map((i) => {
    const s = startOfMonth(subMonths(now, i));
    const e = endOfMonth(subMonths(now, i));
    return prevTx.filter((t) => t.type === "EXPENSE" && new Date(t.date) >= s && new Date(t.date) <= e).reduce((a, b) => a + b.amount, 0);
  }).filter((v) => v > 0);
  const avgMonthlyExpenses = prevMonths.length ? prevMonths.reduce((a, b) => a + b, 0) / prevMonths.length : expenses;
  const emergencyMonths = avgMonthlyExpenses > 0 ? totalBalance / avgMonthlyExpenses : (totalBalance > 0 ? 6 : 0);

  // 50/30/20 buckets
  let needs = 0, wants = 0, invest = 0;
  for (const t of monthTx.filter((t) => t.type === "EXPENSE")) {
    const c = classify(t.category?.name ?? "Outros");
    if (c === "needs") needs += t.amount;
    else if (c === "invest") invest += t.amount;
    else wants += t.amount;
  }
  const savingsBucket = Math.max(0, income - needs - wants); // leftover + investments
  const needsPct = income > 0 ? Math.round((needs / income) * 100) : 0;
  const wantsPct = income > 0 ? Math.round((wants / income) * 100) : 0;
  const savingsPct = income > 0 ? Math.round((savingsBucket / income) * 100) : 0;

  // Top category
  const catMap: Record<string, number> = {};
  for (const t of monthTx.filter((t) => t.type === "EXPENSE")) {
    const name = t.category?.name ?? "Outros";
    catMap[name] = (catMap[name] ?? 0) + t.amount;
  }
  const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  const topCatShare = expenses > 0 && topCat ? Math.round((topCat[1] / expenses) * 100) : 0;

  // ---- Score ----
  const savingsPoints = Math.max(0, Math.min(1, savingsRate / 20)) * 35;
  const emergencyPoints = Math.max(0, Math.min(1, emergencyMonths / 6)) * 25;
  const ratio = income > 0 ? expenses / income : 1;
  const spendingPoints = Math.max(0, Math.min(1, (1 - ratio) / 0.3)) * 25;
  const activeGoals = goals.filter((g) => !g.isCompleted);
  const avgGoalProgress = activeGoals.length
    ? activeGoals.reduce((a, g) => a + Math.min(1, g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0), 0) / activeGoals.length
    : 0;
  const goalPoints = goals.length === 0 ? 0 : (5 + avgGoalProgress * 10);

  const score = Math.round(Math.max(0, Math.min(100, savingsPoints + emergencyPoints + spendingPoints + goalPoints)));

  const rating: HealthResult["rating"] =
    score >= 80 ? "Excelente" : score >= 60 ? "Boa" : score >= 40 ? "Atenção" : "Crítica";

  const breakdown = [
    { label: "Taxa de poupança", points: Math.round(savingsPoints), max: 35 },
    { label: "Reserva de emergência", points: Math.round(emergencyPoints), max: 25 },
    { label: "Gastos vs renda", points: Math.round(spendingPoints), max: 25 },
    { label: "Metas e planejamento", points: Math.round(goalPoints), max: 15 },
  ];

  // ---- Indicators ----
  const indicators: Indicator[] = [
    {
      key: "savings_rate",
      label: "Taxa de poupança",
      value: `${savingsRate.toFixed(0)}%`,
      hint: "Ideal: guardar 20% ou mais da renda",
      status: savingsRate >= 20 ? "good" : savingsRate >= 10 ? "warning" : "bad",
      progress: Math.max(0, Math.min(100, savingsRate)),
    },
    {
      key: "emergency",
      label: "Reserva de emergência",
      value: `${emergencyMonths.toFixed(1)} ${emergencyMonths === 1 ? "mês" : "meses"}`,
      hint: "Ideal: 6 meses de despesas guardados",
      status: emergencyMonths >= 6 ? "good" : emergencyMonths >= 3 ? "warning" : "bad",
      progress: Math.max(0, Math.min(100, (emergencyMonths / 6) * 100)),
    },
    {
      key: "expense_ratio",
      label: "Comprometimento da renda",
      value: income > 0 ? `${Math.round(ratio * 100)}%` : "—",
      hint: "Quanto da renda foi gasto. Ideal: até 70%",
      status: ratio <= 0.7 ? "good" : ratio <= 0.9 ? "warning" : "bad",
      progress: Math.max(0, Math.min(100, ratio * 100)),
    },
    {
      key: "top_category",
      label: "Maior categoria de gasto",
      value: topCat ? `${topCat[0]} (${topCatShare}%)` : "—",
      hint: topCatShare > 40 ? "Concentração alta — diversifique" : "Distribuição saudável",
      status: topCatShare > 45 ? "warning" : "neutral",
      progress: topCatShare,
    },
    {
      key: "balance",
      label: "Saldo livre do mês",
      value: BRL(savings),
      hint: savings >= 0 ? "Você fechou o mês no positivo" : "Você gastou mais do que ganhou",
      status: savings > 0 ? "good" : savings === 0 ? "neutral" : "bad",
    },
    {
      key: "invested",
      label: "Aplicado em investimentos",
      value: BRL(invest),
      hint: invest > 0 ? "Ótimo, seu dinheiro está trabalhando" : "Considere investir o que sobra",
      status: invest > 0 ? "good" : "neutral",
    },
  ];

  // ---- Tips ----
  const tips: Tip[] = [];
  if (income > 0 && expenses > income) {
    tips.push({ id: "overspend", priority: "high", title: "Você está gastando mais do que ganha", text: `Este mês as saídas (${BRL(expenses)}) superaram as entradas (${BRL(income)}). Corte ${BRL(expenses - income)} em gastos não essenciais para equilibrar.` });
  }
  if (emergencyMonths < 3) {
    const target = avgMonthlyExpenses * 6;
    tips.push({ id: "emergency", priority: "high", title: "Construa sua reserva de emergência", text: `Você tem cerca de ${emergencyMonths.toFixed(1)} mês(es) de reserva. O ideal são 6 meses (${BRL(target)}). Comece guardando uma quantia fixa todo mês numa conta separada.` });
  }
  if (savingsRate < 20 && income > 0) {
    tips.push({ id: "savings", priority: "medium", title: "Aumente sua taxa de poupança", text: `Você guardou ${savingsRate.toFixed(0)}% da renda. Tente chegar a 20%. A regra 50/30/20 ajuda: 50% essenciais, 30% desejos, 20% poupança.` });
  }
  if (wantsPct > 30 && income > 0) {
    tips.push({ id: "wants", priority: "medium", title: "Gastos com desejos acima do ideal", text: `${wantsPct}% da sua renda foi para gastos não essenciais (lazer, assinaturas, etc.). O ideal é até 30%. Revise assinaturas e delivery.` });
  }
  if (topCatShare > 45 && topCat) {
    tips.push({ id: "concentration", priority: "medium", title: `Muito gasto concentrado em ${topCat[0]}`, text: `${topCatShare}% das suas despesas estão em ${topCat[0]} (${BRL(topCat[1])}). Vale analisar se dá para reduzir essa categoria.` });
  }
  if (goals.length === 0) {
    tips.push({ id: "goals", priority: "low", title: "Defina metas financeiras", text: "Quem tem objetivos claros poupa mais. Crie uma meta (reserva, viagem, quitar dívida) e acompanhe o progresso na aba Metas." });
  }
  if (invest === 0 && savings > 0) {
    tips.push({ id: "invest", priority: "low", title: "Faça seu dinheiro render", text: `Você fechou o mês com ${BRL(savings)} de sobra. Considere aplicar parte disso (Tesouro Direto, CDB) em vez de deixar parado.` });
  }
  if (tips.length === 0) {
    tips.push({ id: "great", priority: "low", title: "Você está no caminho certo! 🎉", text: "Suas finanças estão saudáveis. Continue registrando tudo e mantendo a disciplina." });
  }

  return {
    hasData: monthTx.length > 0 || accounts.length > 0,
    score,
    rating,
    breakdown,
    indicators,
    rule503020: { needs, wants, savings: savingsBucket, needsPct, wantsPct, savingsPct },
    tips,
    summary: { income, expenses, savings, savingsRate, totalBalance, emergencyMonths },
  };
}
