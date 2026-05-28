import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  date: z.string(),
  categoryId: z.string().optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().optional(),
  status: z.enum(["PENDING", "COMPLETED"]).optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const where: any = { userId: session.user.id };

  if (type && type !== "ALL") where.type = type;

  if (month && year) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
    }),
    db.transaction.count({ where }),
  ]);

  return NextResponse.json({ transactions, total });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const transaction = await db.transaction.create({
      data: {
        ...data,
        date: new Date(data.date),
        status: data.status ?? "COMPLETED",
        userId: session.user.id,
        tags: data.tags ?? [],
      },
      include: { category: true },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: err.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
