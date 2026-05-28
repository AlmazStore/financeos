import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [transactions, categories, goals, budgets, accounts] = await Promise.all([
    db.transaction.findMany({ where: { userId }, include: { category: { select: { name: true } } }, orderBy: { date: "desc" } }),
    db.category.findMany({ where: { userId } }),
    db.goal.findMany({ where: { userId } }),
    db.budget.findMany({ where: { userId }, include: { category: { select: { name: true } } } }),
    db.financialAccount.findMany({ where: { userId } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    transactions: transactions.map((t) => ({
      date: t.date, title: t.title, amount: t.amount, type: t.type, status: t.status, category: t.category?.name ?? null,
    })),
    categories: categories.map((c) => ({ name: c.name, type: c.type })),
    goals: goals.map((g) => ({ title: g.title, target: g.targetAmount, current: g.currentAmount })),
    budgets: budgets.map((b) => ({ category: b.category?.name ?? null, amount: b.amount })),
    accounts: accounts.map((a) => ({ name: a.name, type: a.type, balance: a.balance })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="financeos-dados-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
