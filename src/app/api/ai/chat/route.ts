import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeFinances, answerQuestion } from "@/lib/ai-analysis";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Mensagem inválida" }, { status: 400 });
  }

  const analysis = await analyzeFinances(session.user.id);
  const answer = answerQuestion(message, analysis);

  return NextResponse.json({ answer });
}
