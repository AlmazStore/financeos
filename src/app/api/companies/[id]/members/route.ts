import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "FINANCIAL", "VIEWER"]),
});

async function getMembership(userId: string, companyId: string) {
  return db.companyMember.findFirst({ where: { userId, companyId } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await getMembership(session.user.id, id);
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Sem permissão para convidar" }, { status: 403 });
  }

  try {
    const data = schema.parse(await req.json());

    const user = await db.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return NextResponse.json(
        { error: "Nenhum usuário com esse email. Peça para a pessoa criar uma conta primeiro." },
        { status: 404 }
      );
    }

    const existing = await db.companyMember.findFirst({
      where: { userId: user.id, companyId: id },
    });
    if (existing) return NextResponse.json({ error: "Essa pessoa já é membro." }, { status: 400 });

    const member = await db.companyMember.create({
      data: { userId: user.id, companyId: id, role: data.role },
      include: { user: { select: { name: true, email: true, image: true } } },
    });

    return NextResponse.json({
      id: member.id,
      role: member.role,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
    }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const membership = await getMembership(session.user.id, id);
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId obrigatório" }, { status: 400 });

  const target = await db.companyMember.findFirst({ where: { id: memberId, companyId: id } });
  if (target?.role === "OWNER") return NextResponse.json({ error: "Não é possível remover o dono." }, { status: 400 });

  await db.companyMember.deleteMany({ where: { id: memberId, companyId: id } });
  return NextResponse.json({ ok: true });
}
