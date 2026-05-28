import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ hashes: z.array(z.string()).max(2000) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { hashes } = schema.parse(await req.json());
    if (hashes.length === 0) return NextResponse.json({ existing: [] });

    const found = await db.transaction.findMany({
      where: { userId: session.user.id, importHash: { in: hashes } },
      select: { importHash: true },
    });

    const existing = [...new Set(found.map((f) => f.importHash).filter(Boolean))];
    return NextResponse.json({ existing });
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
