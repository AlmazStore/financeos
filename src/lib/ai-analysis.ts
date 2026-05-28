import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export type Insight = {
  id: string;
  type: "warning" | "success" | "info" | "alert";
  title: string;
  description: string;
};

export type Prediction = {
  title: string;
  value: number;
  label?: string;
  trend: "up" | "down" | "neutral";
  description: string;
  confidence: number;
};

export type Habit = {
  label: string;
  amount: number;
  avg: number;
  trend: "up" | "down";
  pct: number;
};

export type AIAnalysis = {
  hasData: boolean;
  summary: {
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
    totalBalance: number;
    avgMonthlySavings: number;
    avgMonthlyExpenses: number;
  };
  insights: Insight[];
  predictions: Prediction[];
  habits: Habit[];
  topCategories: { name: string; amount: number; icon: string; color: string; pct: number }[];
  pending: { count: number; payable: number; receivable: number };
};

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function analyzeFinances(userId: string): Promise<AIAnalysis> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Last 4 months of completed transactions + accounts + active goals + pending
  const [allTx, accounts, goals, pending] = await Promise.all([
    db.transaction.findMany({
      where: { userId, status: "COMPLETED", date: { gte: startOfMonth(subMonths(now, 3)) } },
      include: { category: true },
    }),
    db.financialAccount.findMany({ where: { userId, isActive: true } }),
    db.goal.findMany({ where: { userId, isCompleted: false } }),
    db.transaction.findMany({ where: { userId, status: "PENDING" } }),
  ]);

  const totalBalance = accounts.reduce((a, b) => a + b.balance, 0);

  const thisMonth = allTx.filter((t) => new Date(t.date) >= monthStart && new Date(t.date) <= monthEnd);
  const income = thisMonth.filter((t) => t.type === "INCOME").reduce((a, b) => a + b.amount, 0);
  const expenses = thisMonth.filter((t) => t.type === "EXPENSE").reduce((a, b) => a + b.amount, 0);
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  // Per-month aggregates for the previous 3 months (excluding current)
  const prevMonths = [1, 2, 3].map((i) => {
    const s = startOfMonth(subMonths(now, i));
    const e = endOfMonth(subMonths(now, i));
    const tx = allTx.filter((t) => new Date(t.date) >= s && new Date(t.date) <= e);
    const inc = tx.filter((t) => t.type === "INCOME").reduce((a, b) => a + b.amount, 0);
    const exp = tx.filter((t) => t.type === "EXPENSE").reduce((a, b) => a + b.amount, 0);
    return { inc, exp, savings: inc - exp };
  });
  const monthsWithData = prevMonths.filter((m) => m.inc > 0 || m.exp > 0);
  const avgMonthlySavings = monthsWithData.length
    ? monthsWithData.reduce((a, b) => a + b.savings, 0) / monthsWithData.length
    : savings;
  const avgMonthlyExpenses = monthsWithData.length
    ? monthsWithData.reduce((a, b) => a + b.exp, 0) / monthsWithData.length
    : expenses;

  // Category breakdown this month
  const catMap: Record<string, { name: string; amount: number; icon: string; color: string }> = {};
  for (const t of thisMonth.filter((t) => t.type === "EXPENSE")) {
    const key = t.categoryId ?? "outros";
    if (!catMap[key]) {
      catMap[key] = {
        name: t.category?.name ?? "Outros",
        amount: 0,
        icon: t.category?.icon ?? "📦",
        color: t.category?.color ?? "#84cc16",
      };
    }
    catMap[key].amount += t.amount;
  }
  const topCategories = Object.values(catMap)
    .map((c) => ({ ...c, pct: expenses > 0 ? Math.round((c.amount / expenses) * 100) : 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // Habits: compare this month category spend vs avg of previous months
  const prevCatTotals: Record<string, number[]> = {};
  for (let i = 1; i <= 3; i++) {
    const s = startOfMonth(subMonths(now, i));
    const e = endOfMonth(subMonths(now, i));
    const tx = allTx.filter((t) => t.type === "EXPENSE" && new Date(t.date) >= s && new Date(t.date) <= e);
    const m: Record<string, number> = {};
    for (const t of tx) {
      const name = t.category?.name ?? "Outros";
      m[name] = (m[name] ?? 0) + t.amount;
    }
    for (const [name, amt] of Object.entries(m)) {
      if (!prevCatTotals[name]) prevCatTotals[name] = [];
      prevCatTotals[name].push(amt);
    }
  }

  const habits: Habit[] = topCategories.slice(0, 5).map((c) => {
    const prev = prevCatTotals[c.name] ?? [];
    const avg = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : c.amount;
    const pct = avg > 0 ? Math.round(((c.amount - avg) / avg) * 100) : 0;
    return { label: c.name, amount: c.amount, avg, trend: pct >= 0 ? "up" : "down", pct };
  });

  // Pending bills
  const payable = pending.filter((t) => t.type === "EXPENSE").reduce((a, b) => a + b.amount, 0);
  const receivable = pending.filter((t) => t.type === "INCOME").reduce((a, b) => a + b.amount, 0);

  // ---- Insights ----
  const insights: Insight[] = [];

  if (income > 0 && expenses > income) {
    insights.push({
      id: "overspend",
      type: "alert",
      title: "Você gastou mais do que ganhou este mês",
      description: `Suas saídas (${BRL(expenses)}) superaram as entradas (${BRL(income)}) em ${BRL(expenses - income)}. Hora de revisar os gastos.`,
    });
  }

  if (savingsRate >= 20) {
    insights.push({
      id: "good-savings",
      type: "success",
      title: "Excelente taxa de economia!",
      description: `Você economizou ${savingsRate.toFixed(0)}% da sua renda este mês (${BRL(savings)}). Continue assim!`,
    });
  } else if (income > 0 && savingsRate > 0 && savingsRate < 10) {
    insights.push({
      id: "low-savings",
      type: "warning",
      title: "Taxa de economia baixa",
      description: `Você economizou apenas ${savingsRate.toFixed(0)}% este mês. A meta saudável é guardar pelo menos 20% da renda.`,
    });
  }

  // Biggest category increase
  const biggestJump = habits.filter((h) => h.trend === "up" && h.pct >= 25).sort((a, b) => b.pct - a.pct)[0];
  if (biggestJump) {
    insights.push({
      id: "cat-jump",
      type: "warning",
      title: `Gastos com ${biggestJump.label} subiram ${biggestJump.pct}%`,
      description: `Você gastou ${BRL(biggestJump.amount)} em ${biggestJump.label}, acima da sua média de ${BRL(biggestJump.avg)}.`,
    });
  }

  if (pending.length > 0) {
    insights.push({
      id: "pending",
      type: "alert",
      title: `${pending.length} ${pending.length === 1 ? "conta pendente" : "contas pendentes"}`,
      description: `Você tem ${BRL(payable)} a pagar e ${BRL(receivable)} a receber em lançamentos futuros. Veja no Fluxo de Caixa.`,
    });
  }

  if (avgMonthlySavings > 0) {
    insights.push({
      id: "projection",
      type: "info",
      title: "Projeção financeira positiva",
      description: `Mantendo o ritmo atual, você terá cerca de ${BRL(totalBalance + avgMonthlySavings * 12)} em 12 meses.`,
    });
  }

  if (topCategories[0]) {
    insights.push({
      id: "top-cat",
      type: "info",
      title: `Maior gasto: ${topCategories[0].name}`,
      description: `${topCategories[0].name} representa ${topCategories[0].pct}% das suas despesas (${BRL(topCategories[0].amount)}) este mês.`,
    });
  }

  // ---- Predictions ----
  const predictions: Prediction[] = [];

  predictions.push({
    title: "Previsão de saldo em 3 meses",
    value: totalBalance + avgMonthlySavings * 3,
    trend: avgMonthlySavings >= 0 ? "up" : "down",
    description: "Baseado na sua média de economia mensal",
    confidence: monthsWithData.length >= 2 ? 85 : 60,
  });

  predictions.push({
    title: "Gastos estimados próximo mês",
    value: avgMonthlyExpenses,
    trend: avgMonthlyExpenses > expenses ? "up" : "down",
    description: "Média dos seus últimos meses",
    confidence: monthsWithData.length >= 2 ? 78 : 55,
  });

  // Nearest goal completion
  if (goals.length && avgMonthlySavings > 0) {
    const sorted = goals
      .map((g) => ({ g, remaining: g.targetAmount - g.currentAmount }))
      .filter((x) => x.remaining > 0)
      .sort((a, b) => a.remaining - b.remaining);
    if (sorted[0]) {
      const months = Math.ceil(sorted[0].remaining / avgMonthlySavings);
      const target = new Date(now);
      target.setMonth(target.getMonth() + months);
      predictions.push({
        title: `Meta "${sorted[0].g.title}" concluída em`,
        value: 0,
        label: target.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        trend: "neutral",
        description: `Faltam ${BRL(sorted[0].remaining)} (~${months} ${months === 1 ? "mês" : "meses"})`,
        confidence: 80,
      });
    }
  }

  return {
    hasData: allTx.length > 0,
    summary: {
      income, expenses, savings, savingsRate,
      totalBalance, avgMonthlySavings, avgMonthlyExpenses,
    },
    insights,
    predictions,
    habits,
    topCategories,
    pending: { count: pending.length, payable, receivable },
  };
}

// ---- Rule-based chat grounded in the user's real data ----
export function answerQuestion(question: string, a: AIAnalysis): string {
  const q = question.toLowerCase();
  const { summary, topCategories, habits, pending } = a;

  if (!a.hasData) {
    return "Ainda não tenho dados suficientes para analisar. Comece adicionando suas transações em Transações → Nova Transação. Assim que você registrar o extrato do mês, eu poderei te dar insights personalizados.";
  }

  // Economizar
  if (q.includes("economiz") || q.includes("poupar") || q.includes("guardar")) {
    const risers = habits.filter((h) => h.trend === "up" && h.pct > 15).slice(0, 2);
    let txt = `Sua taxa de economia atual é de ${summary.savingsRate.toFixed(0)}% (${BRL(summary.savings)} este mês). `;
    if (risers.length) {
      txt += `Identifiquei oportunidades: ${risers.map((r) => `${r.label} subiu ${r.pct}% (${BRL(r.amount)})`).join(", ")}. Reduzir essas categorias liberaria dinheiro para guardar. `;
    }
    if (topCategories[0]) {
      txt += `Seu maior gasto é ${topCategories[0].name} (${BRL(topCategories[0].amount)}). Vale revisar se dá pra cortar.`;
    }
    return txt;
  }

  // Onde gasto mais / categoria
  if (q.includes("gasto") || q.includes("categoria") || q.includes("onde")) {
    if (!topCategories.length) return "Você ainda não tem despesas registradas este mês.";
    const list = topCategories.slice(0, 3).map((c, i) => `${i + 1}) ${c.name}: ${BRL(c.amount)} (${c.pct}%)`).join("  ");
    return `Seus maiores gastos este mês são: ${list}. No total você gastou ${BRL(summary.expenses)}.`;
  }

  // Reserva / meta / quando
  if (q.includes("reserva") || q.includes("meta") || q.includes("quando") || q.includes("atingir")) {
    const goalPred = a.predictions.find((p) => p.title.includes("Meta"));
    if (goalPred) return `${goalPred.title} ${goalPred.label}. ${goalPred.description}.`;
    if (summary.avgMonthlySavings <= 0) return "Para atingir suas metas mais rápido, você precisa primeiro ter uma economia mensal positiva. Atualmente você não está conseguindo guardar dinheiro — vamos focar em reduzir despesas.";
    return `Com sua média de economia de ${BRL(summary.avgMonthlySavings)}/mês, você está no caminho. Crie metas na aba Metas para eu calcular prazos exatos.`;
  }

  // Assinaturas
  if (q.includes("assinatura") || q.includes("cancelar")) {
    const subs = topCategories.find((c) => c.name.toLowerCase().includes("assinatura"));
    if (subs) return `Você gastou ${BRL(subs.amount)} em Assinaturas este mês (${subs.pct}% das despesas). Revise quais serviços você realmente usa — cancelar 1 ou 2 pode gerar uma economia recorrente.`;
    return "Não encontrei uma categoria de Assinaturas com gastos este mês. Se você categorizar serviços como Netflix/Spotify em 'Assinaturas', eu consigo te ajudar a identificar o que cortar.";
  }

  // Contas a pagar
  if (q.includes("pagar") || q.includes("vencer") || q.includes("pendente") || q.includes("fluxo")) {
    if (pending.count === 0) return "Você não tem contas pendentes no momento. 🎉";
    return `Você tem ${pending.count} ${pending.count === 1 ? "conta pendente" : "contas pendentes"}: ${BRL(pending.payable)} a pagar e ${BRL(pending.receivable)} a receber. Acompanhe tudo na aba Fluxo de Caixa.`;
  }

  // Saldo / quanto tenho
  if (q.includes("saldo") || q.includes("quanto") || q.includes("tenho") || q.includes("dinheiro")) {
    return `Seu saldo total nas contas é ${BRL(summary.totalBalance)}. Este mês você teve ${BRL(summary.income)} de entradas e ${BRL(summary.expenses)} de saídas, com saldo livre de ${BRL(summary.savings)}.`;
  }

  // Default — overview
  return `Resumindo suas finanças: este mês você teve ${BRL(summary.income)} de entradas e ${BRL(summary.expenses)} de saídas, economizando ${BRL(summary.savings)} (${summary.savingsRate.toFixed(0)}%). ${topCategories[0] ? `Seu maior gasto foi ${topCategories[0].name} (${BRL(topCategories[0].amount)}).` : ""} Pergunte sobre como economizar, suas categorias de gasto, metas ou contas a pagar.`;
}
