import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = schema.parse(body);

    const exists = await db.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "Este email já está em uso." },
        { status: 400 }
      );
    }

    const hashed = await hash(password, 12);

    const user = await db.user.create({
      data: { name, email, password: hashed },
    });

    // Seed default categories for new user
    await db.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id })),
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
    }
    console.error("[register] error:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

const DEFAULT_CATEGORIES = [
  { name: "Salário", icon: "💼", color: "#10b981", type: "INCOME" as const, isDefault: true },
  { name: "Freelance", icon: "💻", color: "#10b981", type: "INCOME" as const, isDefault: true },
  { name: "Investimentos", icon: "📈", color: "#6366f1", type: "INCOME" as const, isDefault: true },
  { name: "Alimentação", icon: "🛒", color: "#f59e0b", type: "EXPENSE" as const, isDefault: true },
  { name: "Moradia", icon: "🏠", color: "#ef4444", type: "EXPENSE" as const, isDefault: true },
  { name: "Transporte", icon: "🚗", color: "#3b82f6", type: "EXPENSE" as const, isDefault: true },
  { name: "Saúde", icon: "💊", color: "#14b8a6", type: "EXPENSE" as const, isDefault: true },
  { name: "Lazer", icon: "🎮", color: "#ec4899", type: "EXPENSE" as const, isDefault: true },
  { name: "Assinaturas", icon: "📺", color: "#8b5cf6", type: "EXPENSE" as const, isDefault: true },
  { name: "Educação", icon: "📚", color: "#84cc16", type: "EXPENSE" as const, isDefault: true },
];
