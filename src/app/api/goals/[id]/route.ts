import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  addAmount: z.number().optional(),
  currentAmount: z.number().min(0).optional(),
  title: z.string().min(1).optional(),
  targetAmount: z.number().positive().optional(),
  deadline: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const goal = await db.goal.findFirst({ where: { id, userId: session.user.id } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = patchSchema.parse(await req.json());

    const newCurrent =
      body.addAmount !== undefined
        ? goal.currentAmount + body.addAmount
        : body.currentAmount ?? goal.currentAmount;

    const target = body.targetAmount ?? goal.targetAmount;

    const updated = await db.goal.update({
      where: { id },
      data: {
        currentAmount: newCurrent,
        ...(body.title ? { title: body.title } : {}),
        ...(body.targetAmount ? { targetAmount: body.targetAmount } : {}),
        ...(body.deadline !== undefined ? { deadline: body.deadline ? new Date(body.deadline) : null } : {}),
        isCompleted: newCurrent >= target,
      },
    });

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
  const goal = await db.goal.findFirst({ where: { id, userId: session.user.id } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
