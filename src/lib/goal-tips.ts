const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type GoalTipCtx = {
  topCategory?: { name: string; amount: number } | null;
  avgMonthlySavings: number;
};

export type GoalTip = { kind: "pace" | "cut" | "compare" | "info"; text: string };

/**
 * Generates actionable, personalized tips for reaching a goal faster,
 * based on its deadline and the user's real spending.
 */
export function goalTips(
  goal: { targetAmount: number; currentAmount: number; deadline: string | null },
  ctx: GoalTipCtx
): GoalTip[] {
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  if (remaining <= 0) return [];

  const tips: GoalTip[] = [];
  const now = new Date();
  const deadline = goal.deadline ? new Date(goal.deadline) : null;
  const days = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000) : null;

  let monthlyNeeded: number | null = null;

  if (days !== null && days > 0) {
    const weeksLeft = Math.max(1, Math.ceil(days / 7));
    const monthsLeft = Math.max(1, Math.round(days / 30));
    const weekly = remaining / weeksLeft;
    monthlyNeeded = remaining / monthsLeft;
    tips.push({
      kind: "pace",
      text: `Guarde ${BRL(weekly)} por semana (${BRL(monthlyNeeded)}/mês) para bater a meta no prazo. Faltam ${BRL(remaining)}.`,
    });
  } else if (days !== null && days <= 0) {
    tips.push({ kind: "info", text: `O prazo já passou. Revise a data da meta ou aumente o aporte — faltam ${BRL(remaining)}.` });
  } else {
    // No deadline
    if (ctx.avgMonthlySavings > 0) {
      const months = Math.ceil(remaining / ctx.avgMonthlySavings);
      tips.push({
        kind: "pace",
        text: `No seu ritmo atual (${BRL(ctx.avgMonthlySavings)}/mês de sobra), você atinge em ~${months} ${months === 1 ? "mês" : "meses"}. Defina um prazo para ver a meta semanal.`,
      });
    } else {
      tips.push({ kind: "info", text: `Defina um prazo para calcular quanto guardar por semana. Faltam ${BRL(remaining)}.` });
    }
  }

  // Cut biggest category
  if (ctx.topCategory && ctx.topCategory.amount > 0) {
    const freed = ctx.topCategory.amount * 0.3;
    if (freed > 0) {
      const monthsToFund = Math.ceil(remaining / freed);
      tips.push({
        kind: "cut",
        text: `Seu maior gasto é ${ctx.topCategory.name} (${BRL(ctx.topCategory.amount)}/mês). Cortando 30% dele você libera ${BRL(freed)}/mês — só isso banca a meta em ~${monthsToFund} ${monthsToFund === 1 ? "mês" : "meses"}.`,
      });
    }
  }

  // Compare needed pace vs actual savings
  if (monthlyNeeded !== null && ctx.avgMonthlySavings > 0) {
    if (ctx.avgMonthlySavings >= monthlyNeeded) {
      tips.push({ kind: "compare", text: `Você economiza ~${BRL(ctx.avgMonthlySavings)}/mês — mais que o necessário. Está no caminho certo! 🎉` });
    } else {
      const gap = monthlyNeeded - ctx.avgMonthlySavings;
      tips.push({ kind: "compare", text: `Hoje você guarda ~${BRL(ctx.avgMonthlySavings)}/mês, mas precisa de ${BRL(monthlyNeeded)}. Faltam ${BRL(gap)}/mês — é aí que cortar gastos ajuda.` });
    }
  }

  return tips.slice(0, 3);
}
