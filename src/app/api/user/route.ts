import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ name: z.string().min(2).max(80) });

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name } = schema.parse(await req.json());
    const user = await db.user.update({ where: { id: session.user.id }, data: { name }, select: { id: true, name: true, email: true } });
    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Nome inválido" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Cascades remove transactions, goals, budgets, categories, etc.
  await db.user.delete({ where: { id: session.user.id } });
  return NextResponse.json({ ok: true });
}
