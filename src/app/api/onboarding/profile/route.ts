import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null);

  const profile = await db.onboardingProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(profile);
}
