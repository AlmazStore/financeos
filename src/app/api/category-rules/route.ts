import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await db.categoryRule.findMany({
    where: { userId: session.user.id },
    select: { pattern: true, categoryId: true },
  });

  return NextResponse.json({ rules });
}
