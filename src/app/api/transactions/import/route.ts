import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const txSchema = z.object({
  title: z.string().min(1).max(150),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string(),
  categoryId: z.string().nullable().optional(),
  importHash: z.string().optional(),
});

const schema = z.object({
  transactions: z.array(txSchema).min(1).max(1000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { transactions } = schema.parse(await req.json());

    // Validate category ownership
    const userCats = await db.category.findMany({ where: { userId }, select: { id: true } });
    const validCatIds = new Set(userCats.map((c) => c.id));

    // Server-side dedup: drop any transactions whose importHash already exists
    const incomingHashes = transactions.map((t) => t.importHash).filter(Boolean) as string[];
    let existing = new Set<string>();
    if (incomingHashes.length) {
      const found = await db.transaction.findMany({
        where: { userId, importHash: { in: incomingHashes } },
        select: { importHash: true },
      });
      existing = new Set(found.map((f) => f.importHash).filter(Boolean) as string[]);
    }

    // Also dedup within the same payload
    const seen = new Set<string>();
    const toCreate = transactions.filter((t) => {
      if (!t.importHash) return true;
      if (existing.has(t.importHash) || seen.has(t.importHash)) return false;
      seen.add(t.importHash);
      return true;
    });

    let imported = 0;
    if (toCreate.length) {
      const result = await db.transaction.createMany({
        data: toCreate.map((t) => ({
          title: t.title,
          amount: t.amount,
          type: t.type,
          date: new Date(t.date),
          status: "COMPLETED" as const,
          categoryId: t.categoryId && validCatIds.has(t.categoryId) ? t.categoryId : null,
          importHash: t.importHash ?? null,
          userId,
          tags: [],
        })),
      });
      imported = result.count;
    }

    return NextResponse.json(
      { imported, skipped: transactions.length - imported },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: err.errors }, { status: 422 });
    }
    console.error("[import]", err);
    return NextResponse.json({ error: "Erro ao importar" }, { status: 500 });
  }
}
