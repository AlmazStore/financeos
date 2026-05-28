import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { fallbackHash } from "@/lib/statement-parser";

// Finds duplicate transactions (same date+amount+type+description) and removes
// all but the earliest-created one in each group.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const txs = await db.transaction.findMany({
    where: { userId },
    select: { id: true, date: true, amount: true, type: true, title: true, createdAt: true },
    orderBy: { createdAt: "asc" }, // earliest first → we keep the first of each group
  });

  const groups = new Map<string, string[]>();
  for (const t of txs) {
    const iso = t.date.toISOString().slice(0, 10);
    const fp = fallbackHash({ date: iso, amount: t.amount, type: t.type, description: t.title });
    const arr = groups.get(fp);
    if (arr) arr.push(t.id);
    else groups.set(fp, [t.id]);
  }

  const toDelete: string[] = [];
  for (const ids of groups.values()) {
    if (ids.length > 1) toDelete.push(...ids.slice(1)); // keep earliest, remove the rest
  }

  let removed = 0;
  if (toDelete.length) {
    const res = await db.transaction.deleteMany({ where: { id: { in: toDelete }, userId } });
    removed = res.count;
  }

  return NextResponse.json({ removed });
}
