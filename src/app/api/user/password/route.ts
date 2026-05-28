import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { compare, hash } from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  current: z.string().min(1),
  next: z.string().min(6),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { current, next } = schema.parse(await req.json());
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
    if (!user?.password) return NextResponse.json({ error: "Conta sem senha definida." }, { status: 400 });

    const ok = await compare(current, user.password);
    if (!ok) return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });

    const hashed = await hash(next, 12);
    await db.user.update({ where: { id: session.user.id }, data: { password: hashed } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "A nova senha precisa ter ao menos 6 caracteres." }, { status: 422 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
