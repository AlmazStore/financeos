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
});

const schema = z.object({
  transactions: z.array(txSchema).min(1).max(1000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { transactions } = schema.parse(await req.json());

    // Validate that any provided categoryId belongs to the user
    const userCats = await db.category.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const validCatIds = new Set(userCats.map((c) => c.id));

    const result = await db.transaction.createMany({
      data: transactions.map((t) => ({
        title: t.title,
        amount: t.amount,
        type: t.type,
        date: new Date(t.date),
        status: "COMPLETED" as const,
        categoryId: t.categoryId && validCatIds.has(t.categoryId) ? t.categoryId : null,
        userId: session.user.id,
        tags: [],
      })),
    });

    return NextResponse.json({ imported: result.count }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: err.errors }, { status: 422 });
    }
    console.error("[import]", err);
    return NextResponse.json({ error: "Erro ao importar" }, { status: 500 });
  }
}
