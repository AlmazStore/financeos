import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const qMonth = searchParams.get("month");
  const qYear = searchParams.get("year");
  const ref = qMonth && qYear ? new Date(parseInt(qYear), parseInt(qMonth) - 1, 1) : new Date();
  const monthStart = startOfMonth(ref);
  const monthEnd = endOfMonth(ref);

  // Monthly data (7 months ending at the reference month)
  const monthlyData = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const d = subMonths(ref, 6 - i);
      return db.transaction.groupBy({
        by: ["type"],
        where: { userId, status: "COMPLETED", date: { gte: startOfMonth(d), lte: endOfMonth(d) } },
        _sum: { amount: true },
      }).then((rows) => {
        const income = rows.find((r) => r.type === "INCOME")?._sum.amount ?? 0;
        const expenses = rows.find((r) => r.type === "EXPENSE")?._sum.amount ?? 0;
        return {
          month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d),
          income, expenses, savings: income - expenses,
        };
      });
    })
  );

  // Current month transactions for category breakdown + DRE
  const monthTx = await db.transaction.findMany({
    where: { userId, status: "COMPLETED", date: { gte: monthStart, lte: monthEnd } },
    include: { category: true },
  });

  const income = monthTx.filter((t) => t.type === "INCOME").reduce((a, b) => a + b.amount, 0);
  const expenses = monthTx.filter((t) => t.type === "EXPENSE").reduce((a, b) => a + b.amount, 0);

  const catMap: Record<string, { name: string; value: number; color: string }> = {};
  for (const t of monthTx.filter((t) => t.type === "EXPENSE")) {
    const key = t.categoryId ?? "outros";
    if (!catMap[key]) catMap[key] = { name: t.category?.name ?? "Outros", value: 0, color: t.category?.color ?? "#84cc16" };
    catMap[key].value += t.amount;
  }
  const categoryData = Object.values(catMap)
    .map((c) => ({ ...c, percentage: expenses > 0 ? Math.round((c.value / expenses) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);

  // Investment slice (category named "Investimentos")
  const investments = categoryData.find((c) => c.name.toLowerCase().includes("invest"))?.value ?? 0;
  const otherExpenses = expenses - investments;

  const dre = [
    { label: "Receita Bruta", value: income, type: "income" },
    { label: "= Receita Líquida", value: income, type: "subtotal" },
    { label: "(-) Despesas Operacionais", value: -otherExpenses, type: "deduction" },
    { label: "(-) Investimentos", value: -investments, type: "deduction" },
    { label: "= Resultado Líquido", value: income - expenses, type: "result" },
  ];

  return NextResponse.json({
    monthlyData,
    categoryData,
    dre,
    summary: { income, expenses, savings: income - expenses },
    monthLabel: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(ref),
  });
}
