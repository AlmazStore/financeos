import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { startOfMonth, endOfMonth } from "date-fns";

const schema = z.object({
  categoryId: z.string(),
  amount: z.number().positive(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [budgets, monthExpenses] = await Promise.all([
    db.budget.findMany({ where: { userId }, include: { category: true } }),
    db.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", status: "COMPLETED", date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
  ]);

  const spentByCat: Record<string, number> = {};
  for (const row of monthExpenses) {
    if (row.categoryId) spentByCat[row.categoryId] = row._sum.amount ?? 0;
  }

  const result = budgets.map((b) => {
    const spent = b.categoryId ? spentByCat[b.categoryId] ?? 0 : 0;
    return {
      id: b.id,
      categoryId: b.categoryId,
      category: b.category ? { name: b.category.name, icon: b.category.icon, color: b.category.color } : null,
      amount: b.amount,
      spent,
      pct: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
      remaining: b.amount - spent,
    };
  }).sort((a, b) => b.pct - a.pct);

  const totalBudget = result.reduce((a, b) => a + b.amount, 0);
  const totalSpent = result.reduce((a, b) => a + b.spent, 0);

  return NextResponse.json({ budgets: result, totals: { budget: totalBudget, spent: totalSpent } });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const data = schema.parse(await req.json());

    // category must belong to user
    const cat = await db.category.findFirst({ where: { id: data.categoryId, userId }, select: { id: true } });
    if (!cat) return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });

    // one budget per category — upsert behaviour
    const existing = await db.budget.findFirst({ where: { userId, categoryId: data.categoryId } });
    if (existing) {
      const updated = await db.budget.update({ where: { id: existing.id }, data: { amount: data.amount } });
      return NextResponse.json(updated);
    }

    const budget = await db.budget.create({
      data: { userId, categoryId: data.categoryId, amount: data.amount, period: "MONTHLY" },
    });
    return NextResponse.json(budget, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
