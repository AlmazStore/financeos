import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

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

// Wipes all of the user's financial data and resets onboarding,
// keeping the login. Used to experience the app as a brand-new user.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  // Delete companies the user owns (cascades members/clients/categories/transactions)
  const owned = await db.companyMember.findMany({ where: { userId, role: "OWNER" }, select: { companyId: true } });
  const companyIds = owned.map((o) => o.companyId);
  if (companyIds.length) await db.company.deleteMany({ where: { id: { in: companyIds } } });

  // Wipe personal data
  await db.$transaction([
    db.transaction.deleteMany({ where: { userId } }),
    db.budget.deleteMany({ where: { userId } }),
    db.goal.deleteMany({ where: { userId } }),
    db.recurringTransaction.deleteMany({ where: { userId } }),
    db.categoryRule.deleteMany({ where: { userId } }),
    db.financialAccount.deleteMany({ where: { userId } }),
    db.notification.deleteMany({ where: { userId } }),
    db.companyMember.deleteMany({ where: { userId } }),
    db.category.deleteMany({ where: { userId } }),
    db.onboardingProfile.deleteMany({ where: { userId } }),
  ]);

  // Recreate the default categories (like a fresh signup)
  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
  });

  return NextResponse.json({ ok: true });
}
