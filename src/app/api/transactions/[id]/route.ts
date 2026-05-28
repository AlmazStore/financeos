import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const transaction = await db.transaction.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const transaction = await db.transaction.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.transaction.update({
    where: { id },
    data: body,
    include: { category: true },
  });

  return NextResponse.json(updated);
}
