import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { computeAchievements } from "@/lib/achievements";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await computeAchievements(session.user.id);
  return NextResponse.json(result);
}
