import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(40).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(["INCOME", "EXPENSE", "BOTH"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cat = await db.category.findFirst({ where: { id, userId: session.user.id } });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const data = schema.parse(await req.json());
    const updated = await db.category.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const cat = await db.category.findFirst({ where: { id, userId: session.user.id } });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Detach transactions from this category instead of deleting them
  await db.transaction.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await db.category.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
