import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // All pending (future/unpaid) transactions = accounts payable/receivable
  const pending = await db.transaction.findMany({
    where: { userId: session.user.id, status: "PENDING" },
    include: { category: true },
    orderBy: { date: "asc" },
  });

  const upcoming = pending.map((t) => ({
    id: t.id,
    name: t.title,
    amount: t.amount,
    date: t.date,
    type: t.type === "INCOME" ? "receivable" : "payable",
    recurrent: t.isRecurring,
    category: t.category?.icon ?? (t.type === "INCOME" ? "💰" : "📤"),
  }));

  const totalReceivable = upcoming.filter((u) => u.type === "receivable").reduce((a, b) => a + b.amount, 0);
  const totalPayable = upcoming.filter((u) => u.type === "payable").reduce((a, b) => a + b.amount, 0);

  // Chart: group by date (dd/mm)
  const byDate: Record<string, { date: string; payable: number; receivable: number }> = {};
  for (const u of upcoming) {
    const d = new Date(u.date);
    const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byDate[key]) byDate[key] = { date: key, payable: 0, receivable: 0 };
    if (u.type === "payable") byDate[key].payable += u.amount;
    else byDate[key].receivable += u.amount;
  }
  const chart = Object.values(byDate);

  return NextResponse.json({
    upcoming,
    chart,
    totals: { receivable: totalReceivable, payable: totalPayable, balance: totalReceivable - totalPayable },
  });
}
