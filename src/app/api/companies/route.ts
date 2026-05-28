import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  cnpj: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await db.companyMember.findMany({
    where: { userId: session.user.id },
    include: {
      company: {
        include: {
          transactions: { select: { type: true, amount: true, status: true } },
          _count: { select: { members: true, clients: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const companies = memberships.map((m) => {
    const txs = m.company.transactions;
    const revenue = txs.filter((t) => t.type === "INCOME").reduce((a, b) => a + b.amount, 0);
    const expenses = txs.filter((t) => t.type === "EXPENSE").reduce((a, b) => a + b.amount, 0);
    return {
      id: m.company.id,
      name: m.company.name,
      cnpj: m.company.cnpj,
      color: m.company.color,
      description: m.company.description,
      role: m.role,
      revenue,
      expenses,
      profit: revenue - expenses,
      membersCount: m.company._count.members,
      clientsCount: m.company._count.clients,
    };
  });

  return NextResponse.json({ companies });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = schema.parse(await req.json());

    const company = await db.company.create({
      data: {
        name: data.name,
        cnpj: data.cnpj || null,
        description: data.description || null,
        color: data.color || "#8b5cf6",
        members: {
          create: { userId: session.user.id, role: "OWNER" },
        },
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    console.error("[companies]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
