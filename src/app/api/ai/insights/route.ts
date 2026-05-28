import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeFinances } from "@/lib/ai-analysis";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const analysis = await analyzeFinances(session.user.id);
  return NextResponse.json(analysis);
}
