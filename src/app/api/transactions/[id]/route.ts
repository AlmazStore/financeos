import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { normalizeMerchant } from "@/lib/category-rules";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const transaction = await db.transaction.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const transaction = await db.transaction.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only allow editing a safe set of fields
  const data: Record<string, unknown> = {};
  if (body.categoryId !== undefined) {
    if (body.categoryId === null) {
      data.categoryId = null;
    } else {
      const cat = await db.category.findFirst({
        where: { id: body.categoryId, userId: session.user.id },
        select: { id: true },
      });
      data.categoryId = cat ? body.categoryId : null;
    }
  }
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.amount === "number" && body.amount > 0) data.amount = body.amount;
  if (body.type === "INCOME" || body.type === "EXPENSE") data.type = body.type;
  if (body.status === "PENDING" || body.status === "COMPLETED") data.status = body.status;
  if (typeof body.date === "string") data.date = new Date(body.date);

  const updated = await db.transaction.update({
    where: { id },
    data,
    include: { category: true },
  });

  // Learn from the user's category choice for future imports
  if (body.categoryId !== undefined) {
    const pattern = normalizeMerchant(updated.title);
    if (pattern.length >= 3) {
      if (data.categoryId) {
        await db.categoryRule.upsert({
          where: { userId_pattern: { userId: session.user.id, pattern } },
          create: { userId: session.user.id, pattern, categoryId: data.categoryId as string },
          update: { categoryId: data.categoryId as string },
        }).catch(() => {});
      } else {
        await db.categoryRule.deleteMany({ where: { userId: session.user.id, pattern } }).catch(() => {});
      }
    }
  }

  return NextResponse.json(updated);
}
