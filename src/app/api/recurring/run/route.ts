import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { advanceDate, type Frequency } from "@/lib/recurrence";

// Materializes any recurring rules whose nextDueDate has passed.
// Runs lazily when the user opens the app (no external cron needed).
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const now = new Date();
  const rules = await db.recurringTransaction.findMany({
    where: { userId, isActive: true, nextDueDate: { lte: now } },
  });

  let created = 0;

  for (const rule of rules) {
    let due = new Date(rule.nextDueDate);
    const toCreate: { date: Date }[] = [];
    let guard = 0;

    while (due <= now && guard < 120) {
      if (rule.endDate && due > rule.endDate) break;
      toCreate.push({ date: new Date(due) });
      due = advanceDate(due, rule.frequency as Frequency);
      guard++;
    }

    if (toCreate.length) {
      await db.transaction.createMany({
        data: toCreate.map((t) => ({
          title: rule.title,
          amount: rule.amount,
          type: rule.type,
          date: t.date,
          status: "COMPLETED" as const,
          categoryId: rule.categoryId,
          userId,
          recurringId: rule.id,
          isRecurring: true,
          tags: [],
        })),
      });
      created += toCreate.length;
    }

    const stop = rule.endDate ? due > rule.endDate : false;
    await db.recurringTransaction.update({
      where: { id: rule.id },
      data: { nextDueDate: due, isActive: stop ? false : true },
    });
  }

  return NextResponse.json({ created });
}
