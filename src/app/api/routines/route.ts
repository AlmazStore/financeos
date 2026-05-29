import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { addDays, addWeeks, addMonths } from "date-fns";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  time: z.string().optional(),
});

function calcNextDue(frequency: string, dayOfWeek?: number, dayOfMonth?: number): Date {
  const now = new Date();
  if (frequency === "DAILY") return addDays(now, 1);
  if (frequency === "WEEKLY") {
    const next = addDays(now, 1);
    if (dayOfWeek !== undefined) {
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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const routines = await db.routine.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ routines });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const nextDueAt = calcNextDue(data.frequency, data.dayOfWeek, data.dayOfMonth);

    const routine = await db.routine.create({
      data: {
        title: data.title,
        description: data.description,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek,
        dayOfMonth: data.dayOfMonth,
        time: data.time,
        nextDueAt,
        userId: session.user.id,
      },
    });

    return NextResponse.json(routine, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
