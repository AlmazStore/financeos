const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateBR = (d: Date) => d.toLocaleDateString("pt-BR");
const monthYear = (d: Date) => {
  const s = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

export type GoalTipCtx = {
  topCategory?: { name: string; amount: number } | null;
  avgMonthlySavings: number;
};

export type GoalTip = { kind: "pace" | "cut" | "compare" | "info"; text: string };

/**
 * Detailed, personalized tips for reaching a goal faster — per day/week/month
 * targets, projected completion date at the current pace, and a cut suggestion
 * on the biggest spending category. All numbers come from the user's real data.
 */
export function goalTips(
  goal: { targetAmount: number; currentAmount: number; deadline: string | null },
  ctx: GoalTipCtx
): GoalTip[] {
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  if (remaining <= 0) return [];

  const tips: GoalTip[] = [];
  const now = new Date();
  const avg = ctx.avgMonthlySavings;
  const deadline = goal.deadline ? new Date(goal.deadline) : null;
  const days = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000) : null;

  let perMonth: number | null = null;

  if (days !== null && days > 0) {
    const weeks = Math.max(1, Math.ceil(days / 7));
    const months = Math.max(1, Math.round(days / 30));
    const perDay = remaining / days;
    const perWeek = remaining / weeks;
    perMonth = remaining / months;

    tips.push({
      kind: "pace",
      text: `Faltam ${BRL(remaining)} e ${days} dias (até ${dateBR(deadline!)}). Para chegar no prazo, guarde ${BRL(perDay)}/dia — ou ${BRL(perWeek)}/semana, ou ${BRL(perMonth)}/mês.`,
    });

    // Projection at current pace
    if (avg > 0) {
      const monthsAtPace = Math.max(1, Math.ceil(remaining / avg));
      const projDate = addMonths(now, monthsAtPace);
      if (projDate <= deadline!) {
        tips.push({ kind: "compare", text: `No seu ritmo atual (${BRL(avg)}/mês ≈ ${BRL(avg / 30)}/dia) você chega por volta de ${monthYear(projDate)} — antes do prazo. Continue assim! 🎉` });
      } else {
        const extra = perMonth - avg;
        tips.push({ kind: "compare", text: `No ritmo atual (${BRL(avg)}/mês) você só chegaria em ${monthYear(projDate)}, depois do prazo. Para não atrasar, guarde ${BRL(extra)}/mês a mais (${BRL(extra / 30)}/dia).` });
      }
    }
  } else if (days !== null && days <= 0) {
    tips.push({ kind: "info", text: `O prazo já passou e faltam ${BRL(remaining)}. Revise a data da meta ou faça um aporte maior para concluí-la.` });
  } else {
    // No deadline
    if (avg > 0) {
      const months = Math.max(1, Math.ceil(remaining / avg));
      const projDate = addMonths(now, months);
      tips.push({ kind: "pace", text: `Sem prazo definido. No seu ritmo (${BRL(avg)}/mês ≈ ${BRL(avg / 30)}/dia) você atinge em ~${months} ${months === 1 ? "mês" : "meses"}, por volta de ${monthYear(projDate)}.` });
    } else {
      tips.push({ kind: "info", text: `Você não está conseguindo guardar este mês. Reduza despesas para começar a avançar — faltam ${BRL(remaining)}.` });
    }
    // Concrete targets for common horizons
    tips.push({ kind: "compare", text: `Quer um alvo? Em 12 meses são ${BRL(remaining / 12)}/mês (${BRL(remaining / 365)}/dia); em 6 meses, ${BRL(remaining / 6)}/mês. Defina um prazo na meta para acompanhar.` });
  }

  // Cut biggest category
  if (ctx.topCategory && ctx.topCategory.amount > 0) {
    const freed = ctx.topCategory.amount * 0.3;
    if (freed > 0) {
      const monthsToFund = Math.max(1, Math.ceil(remaining / freed));
      tips.push({
        kind: "cut",
        text: `Seu maior gasto é ${ctx.topCategory.name}: ${BRL(ctx.topCategory.amount)}/mês (${BRL(ctx.topCategory.amount / 30)}/dia). Cortando 30% você libera ${BRL(freed)}/mês — sozinho isso banca a meta em ~${monthsToFund} ${monthsToFund === 1 ? "mês" : "meses"}.`,
      });
    }
  }

  return tips.slice(0, 4);
}
