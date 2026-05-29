import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().optional(),
  reminderAt: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const today = searchParams.get("today");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (status) where.status = status;
  if (today === "true") {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    where.dueDate = { lte: end };
    where.status = { in: ["PENDING", "IN_PROGRESS"] };
  }

  const tasks = await db.task.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const task = await db.task.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority ?? "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
        userId: session.user.id,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
