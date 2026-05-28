import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { getExistingFingerprints } from "@/lib/dedup";
import { fallbackHash } from "@/lib/statement-parser";

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

    // Server-side dedup against all existing transactions (stored hash + computed fingerprint)
    const existing = await getExistingFingerprints(userId);

    // Also dedup within the same payload
    const seen = new Set<string>();
    const toCreate = transactions.filter((t) => {
      const primary = t.importHash ?? null;
      const fb = fallbackHash({ date: t.date, amount: t.amount, type: t.type, description: t.title });
      const isDup =
        (primary && (existing.has(primary) || seen.has(primary))) ||
        existing.has(fb) || seen.has(fb);
      if (isDup) return false;
      if (primary) seen.add(primary);
      seen.add(fb);
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
