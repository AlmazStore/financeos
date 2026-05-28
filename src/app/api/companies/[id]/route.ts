import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth } from "date-fns";

async function getMembership(userId: string, companyId: string) {
  return db.companyMember.findFirst({ where: { userId, companyId } });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await getMembership(session.user.id, id);
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();

  const [company, transactions, clients, members, upcoming] = await Promise.all([
    db.company.findUnique({ where: { id } }),
    db.transaction.findMany({
      where: { companyId: id },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    db.client.findMany({ where: { companyId: id }, orderBy: { createdAt: "desc" } }),
    db.companyMember.findMany({
      where: { companyId: id },
      include: { user: { select: { name: true, email: true, image: true } } },
    }),
    db.transaction.findMany({
      where: { companyId: id, status: "PENDING" },
      orderBy: { date: "asc" },
      take: 10,
    }),
  ]);

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const revenue = transactions.filter((t) => t.type === "INCOME").reduce((a, b) => a + b.amount, 0);
  const expenses = transactions.filter((t) => t.type === "EXPENSE").reduce((a, b) => a + b.amount, 0);

  // Monthly breakdown (current month)
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthTx = transactions.filter((t) => new Date(t.date) >= monthStart && new Date(t.date) <= monthEnd);
  const monthRevenue = monthTx.filter((t) => t.type === "INCOME").reduce((a, b) => a + b.amount, 0);
  const monthExpenses = monthTx.filter((t) => t.type === "EXPENSE").reduce((a, b) => a + b.amount, 0);

  return NextResponse.json({
    company: {
      ...company,
      role: membership.role,
      revenue,
      expenses,
      profit: revenue - expenses,
      monthRevenue,
      monthExpenses,
      monthProfit: monthRevenue - monthExpenses,
    },
    transactions: transactions.slice(0, 20),
    upcoming,
    clients,
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
    })),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await getMembership(session.user.id, id);
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await db.company.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.cnpj !== undefined ? { cnpj: body.cnpj || null } : {}),
      ...(body.description !== undefined ? { description: body.description || null } : {}),
      ...(body.color ? { color: body.color } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await getMembership(session.user.id, id);
  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json({ error: "Apenas o dono pode excluir" }, { status: 403 });
  }

  await db.company.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
