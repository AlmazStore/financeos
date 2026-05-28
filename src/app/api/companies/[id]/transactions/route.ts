import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.string(),
  status: z.enum(["PENDING", "COMPLETED"]).optional(),
  notes: z.string().optional(),
});

async function canAccess(userId: string, companyId: string) {
  return db.companyMember.findFirst({ where: { userId, companyId } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await canAccess(session.user.id, id);
  if (!membership || membership.role === "VIEWER") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const data = schema.parse(await req.json());
    const tx = await db.transaction.create({
      data: {
        title: data.title,
        amount: data.amount,
        type: data.type,
        date: new Date(data.date),
        status: data.status ?? "COMPLETED",
        notes: data.notes || null,
        companyId: id,
      },
    });
    return NextResponse.json(tx, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
