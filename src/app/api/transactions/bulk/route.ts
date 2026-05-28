import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { normalizeMerchant } from "@/lib/category-rules";

const patchSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  categoryId: z.string().nullable(),
});

const deleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
});

// Bulk set category
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { ids, categoryId } = patchSchema.parse(await req.json());

    // Validate category ownership when provided
    let finalCategoryId: string | null = null;
    if (categoryId) {
      const cat = await db.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
      if (!cat) return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
      finalCategoryId = cat.id;
    }

    const result = await db.transaction.updateMany({
      where: { id: { in: ids }, userId },
      data: { categoryId: finalCategoryId },
    });

    // Learn merchant→category from this bulk action
    if (finalCategoryId) {
      const txs = await db.transaction.findMany({ where: { id: { in: ids }, userId }, select: { title: true } });
      const patterns = [...new Set(txs.map((t) => normalizeMerchant(t.title)).filter((p) => p.length >= 3))];
      for (const pattern of patterns) {
        await db.categoryRule.upsert({
          where: { userId_pattern: { userId, pattern } },
          create: { userId, pattern, categoryId: finalCategoryId },
          update: { categoryId: finalCategoryId },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ updated: result.count });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Bulk delete
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { ids } = deleteSchema.parse(await req.json());
    const result = await db.transaction.deleteMany({ where: { id: { in: ids }, userId } });
    return NextResponse.json({ deleted: result.count });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
