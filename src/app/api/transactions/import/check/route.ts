import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { getExistingFingerprints } from "@/lib/dedup";

const schema = z.object({ hashes: z.array(z.string()).max(4000) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { hashes } = schema.parse(await req.json());
    if (hashes.length === 0) return NextResponse.json({ existing: [] });

    const fingerprints = await getExistingFingerprints(session.user.id);
    const existing = [...new Set(hashes.filter((h) => fingerprints.has(h)))];
    return NextResponse.json({ existing });
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
