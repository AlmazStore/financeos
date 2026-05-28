import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, startOfYear, subMonths } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const [
    currentMonthTx,
    lastMonthTx,
    accounts,
    goals,
    recentTransactions,
    categories,
    cancelledTx,
  ] = await Promise.all([
    db.transaction.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd }, status: "COMPLETED" },
      include: { category: true },
    }),
    db.transaction.findMany({
      where: { userId, date: { gte: lastMonthStart, lte: lastMonthEnd }, status: "COMPLETED" },
    }),
    db.financialAccount.findMany({ where: { userId, isActive: true } }),
    db.goal.findMany({ where: { userId, isCompleted: false }, take: 4 }),
    db.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 8,
    }),
    db.category.findMany({ where: { userId } }),
    db.transaction.findMany({
      where: { userId, date: { gte: monthStart, lte: monthEnd }, status: "CANCELLED" },
    }),
  ]);

  const cancelledTotal = cancelledTx.reduce((a, b) => a + b.amount, 0);

  const currentIncome = currentMonthTx
    .filter((t) => t.type === "INCOME")
    .reduce((a, b) => a + b.amount, 0);

  const currentExpenses = currentMonthTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((a, b) => a + b.amount, 0);

  const lastIncome = lastMonthTx
    .filter((t) => t.type === "INCOME")
    .reduce((a, b) => a + b.amount, 0);

  const lastExpenses = lastMonthTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((a, b) => a + b.amount, 0);

  const totalBalance = accounts.reduce((a, b) => a + b.balance, 0);

  const incomeChange = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
  const expensesChange = lastExpenses > 0 ? ((currentExpenses - lastExpenses) / lastExpenses) * 100 : 0;

  // Category breakdown
  const expensesByCategory = currentMonthTx
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc: Record<string, { amount: number; name: string; color: string; icon: string }>, t) => {
      const key = t.categoryId ?? "outros";
      if (!acc[key]) {
        acc[key] = {
          amount: 0,
          name: t.category?.name ?? "Outros",
          color: t.category?.color ?? "#84cc16",
          icon: t.category?.icon ?? "📦",
        };
      }
      acc[key].amount += t.amount;
      return acc;
    }, {});

  const categoryData = Object.entries(expensesByCategory)
    .map(([id, data]) => ({
      id,
      name: data.name,
      value: data.amount,
      color: data.color,
      icon: data.icon,
      percentage: currentExpenses > 0 ? Math.round((data.amount / currentExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Monthly chart (last 7 months)
  const monthlyData = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const d = subMonths(now, 6 - i);
      return db.transaction.groupBy({
        by: ["type"],
        where: {
          userId,
          status: "COMPLETED",
          date: { gte: startOfMonth(d), lte: endOfMonth(d) },
        },
        _sum: { amount: true },
      }).then((rows) => {
        const income = rows.find((r) => r.type === "INCOME")?._sum.amount ?? 0;
        const expenses = rows.find((r) => r.type === "EXPENSE")?._sum.amount ?? 0;
        return {
          month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d),
          income,
          expenses,
          savings: income - expenses,
        };
      });
    })
  );

  return NextResponse.json({
    summary: {
      totalBalance,
      currentIncome,
      currentExpenses,
      savings: currentIncome - currentExpenses,
      incomeChange,
      expensesChange,
      cancelledTotal,
      cancelledCount: cancelledTx.length,
    },
    monthlyData,
    categoryData,
    recentTransactions,
    goals,
    accounts,
  });
}
