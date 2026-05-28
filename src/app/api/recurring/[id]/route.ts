import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rule = await db.recurringTransaction.findFirst({ where: { id, userId: session.user.id } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await db.recurringTransaction.update({
    where: { id },
    data: { ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}) },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rule = await db.recurringTransaction.findFirst({ where: { id, userId: session.user.id } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Detach generated transactions (keep them), then delete the rule
  await db.transaction.updateMany({ where: { recurringId: id }, data: { recurringId: null } });
  await db.recurringTransaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
