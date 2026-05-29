import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { addDays, addWeeks, addMonths } from "date-fns";

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  dayOfWeek: z.number().min(0).max(6).optional().nullable(),
  dayOfMonth: z.number().min(1).max(31).optional().nullable(),
  time: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  markDone: z.boolean().optional(),
});

function calcNextDue(frequency: string, dayOfWeek?: number | null, dayOfMonth?: number | null): Date {
  const now = new Date();
  if (frequency === "DAILY") return addDays(now, 1);
  if (frequency === "WEEKLY") {
    const next = addDays(now, 1);
    if (dayOfWeek != null) {
      while (next.getDay() !== dayOfWeek) next.setDate(next.getDate() + 1);
    }
    return next;
  }
  if (frequency === "BIWEEKLY") return addWeeks(now, 2);
  if (frequency === "MONTHLY") {
    const next = addMonths(now, 1);
    if (dayOfMonth) next.setDate(Math.min(dayOfMonth, 28));
    return next;
  }
  return addDays(now, 1);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.routine.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
    if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth;
    if (data.time !== undefined) updateData.time = data.time;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.markDone) {
      updateData.lastDoneAt = new Date();
      const freq = data.frequency ?? existing.frequency;
      updateData.nextDueAt = calcNextDue(freq, data.dayOfWeek ?? existing.dayOfWeek, data.dayOfMonth ?? existing.dayOfMonth);
    }

    const routine = await db.routine.update({ where: { id }, data: updateData });
    return NextResponse.json(routine);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.routine.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.routine.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
