import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  profileType: z.enum(["PERSONAL", "FREELANCER", "SMALL_BUSINESS", "ENTERPRISE"]),
  mainGoal: z.enum(["SAVE_MONEY", "CONTROL_SPENDING", "GROW_BUSINESS", "PAY_DEBT", "INVEST"]),
  monthlyRevenue: z.enum(["UNDER_2K", "FROM_2K_TO_5K", "FROM_5K_TO_15K", "FROM_15K_TO_50K", "OVER_50K"]),
  mainExpenses: z.array(z.string()),
  hasTeam: z.boolean(),
  businessSector: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await db.onboardingProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const profile = await db.onboardingProfile.upsert({
      where: { userId: session.user.id },
      create: { ...data, userId: session.user.id, isCompleted: true },
      update: { ...data, isCompleted: true },
    });

    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 422 });
    console.error("[onboarding]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tutorialDone } = await req.json();
  await db.onboardingProfile.updateMany({
    where: { userId: session.user.id },
    data: { tutorialDone: Boolean(tutorialDone) },
  });

  return NextResponse.json({ ok: true });
}
