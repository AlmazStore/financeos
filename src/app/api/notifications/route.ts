import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, differenceInCalendarDays } from "date-fns";

type Notif = { id: string; type: "alert" | "reminder" | "info" | "success"; title: string; message: string };

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ notifications: [] });
  const userId = session.user.id;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [pending, monthTx, budgets, monthExpensesByCat] = await Promise.all([
    db.transaction.findMany({ where: { userId, status: "PENDING" }, orderBy: { date: "asc" }, take: 30 }),
    db.transaction.findMany({ where: { userId, status: "COMPLETED", date: { gte: monthStart, lte: monthEnd } }, select: { type: true, amount: true } }),
    db.budget.findMany({ where: { userId }, include: { category: true } }),
    db.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", status: "COMPLETED", date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
  ]);

  const notifications: Notif[] = [];

  // Bills due / overdue
  for (const t of pending) {
    const days = differenceInCalendarDays(new Date(t.date), now);
    const kind = t.type === "INCOME" ? "a receber" : "a pagar";
    if (days < 0) {
      notifications.push({ id: `due-${t.id}`, type: "alert", title: `Conta vencida: ${t.title}`, message: `${BRL(t.amount)} ${kind}, venceu há ${Math.abs(days)} dia(s).` });
    } else if (days <= 5) {
      notifications.push({ id: `due-${t.id}`, type: "reminder", title: `${t.title} vence ${days === 0 ? "hoje" : `em ${days} dia(s)`}`, message: `${BRL(t.amount)} ${kind}.` });
    }
  }

  // Budgets
  const spentByCat: Record<string, number> = {};
  for (const row of monthExpensesByCat) if (row.categoryId) spentByCat[row.categoryId] = row._sum.amount ?? 0;
  for (const b of budgets) {
    const spent = b.categoryId ? spentByCat[b.categoryId] ?? 0 : 0;
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    const name = b.category?.name ?? "categoria";
    if (pct >= 100) {
      notifications.push({ id: `budget-${b.id}`, type: "alert", title: `Orçamento estourado: ${name}`, message: `Você gastou ${BRL(spent)} de ${BRL(b.amount)} (${Math.round(pct)}%).` });
    } else if (pct >= 85) {
      notifications.push({ id: `budget-${b.id}`, type: "reminder", title: `Orçamento quase no limite: ${name}`, message: `${Math.round(pct)}% usado — restam ${BRL(b.amount - spent)}.` });
    }
  }

  // Overspending this month
  const income = monthTx.filter((t) => t.type === "INCOME").reduce((a, b) => a + b.amount, 0);
  const expenses = monthTx.filter((t) => t.type === "EXPENSE").reduce((a, b) => a + b.amount, 0);
  if (income > 0 && expenses > income) {
    notifications.push({ id: "overspend-month", type: "alert", title: "Gastos acima da renda", message: `Este mês você gastou ${BRL(expenses - income)} a mais do que ganhou.` });
  }

  // Order: alerts first, then reminders, then info/success
  const weight = { alert: 0, reminder: 1, info: 2, success: 3 };
  notifications.sort((a, b) => weight[a.type] - weight[b.type]);

  return NextResponse.json({ notifications });
}
