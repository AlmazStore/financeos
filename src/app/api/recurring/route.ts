import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { advanceDate, type Frequency } from "@/lib/recurrence";

const schema = z.object({
  title: z.string().min(1).max(150),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().nullable().optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
  startDate: z.string(),
  // when created from an already-registered transaction, the first occurrence
  // is the next period (avoid duplicating the current one)
  startNextPeriod: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db.recurringTransaction.findMany({
    where: { userId: session.user.id },
    include: { transactions: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    recurring: items.map((r) => ({
      id: r.id, title: r.title, amount: r.amount, type: r.type,
      frequency: r.frequency, categoryId: r.categoryId,
      nextDueDate: r.nextDueDate, isActive: r.isActive,
      generated: r.transactions.length,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = schema.parse(await req.json());
    const start = new Date(data.startDate);
    const nextDue = data.startNextPeriod ? advanceDate(start, data.frequency as Frequency) : start;

    const rule = await db.recurringTransaction.create({
      data: {
        title: data.title,
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId ?? null,
        frequency: data.frequency,
        userId: session.user.id,
        startDate: start,
        nextDueDate: nextDue,
        isActive: true,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
