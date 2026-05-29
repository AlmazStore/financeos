import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  dueDate: z.string().optional().nullable(),
  reminderAt: z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.task.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const task = await db.task.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
        reminderAt: data.reminderAt !== undefined ? (data.reminderAt ? new Date(data.reminderAt) : null) : undefined,
        completedAt: data.status === "COMPLETED" ? new Date() : data.status ? null : undefined,
      },
    });

    return NextResponse.json(task);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.task.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
