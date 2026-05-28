import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  document: z.string().optional(),
  notes: z.string().optional(),
});

async function canAccess(userId: string, companyId: string) {
  return db.companyMember.findFirst({ where: { userId, companyId } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canAccess(session.user.id, id))) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
    const data = schema.parse(await req.json());
    const client = await db.client.create({
      data: {
        companyId: id,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        document: data.document || null,
        notes: data.notes || null,
      },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!(await canAccess(session.user.id, id))) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId obrigatório" }, { status: 400 });

  await db.client.deleteMany({ where: { id: clientId, companyId: id } });
  return NextResponse.json({ ok: true });
}
