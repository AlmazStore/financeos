import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { computeHealth } from "@/lib/financial-health";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const health = await computeHealth(session.user.id);
  return NextResponse.json(health);
}
