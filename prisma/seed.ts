import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Demo user
  const hashedPassword = await hash("demo123456", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@financeos.app" },
    update: {},
    create: {
      name: "Rafael Mendes",
      email: "demo@financeos.app",
      password: hashedPassword,
    },
  });

  console.log("✅ Demo user:", user.email);

  // Default categories
  const categories = await Promise.all([
    prisma.category.upsert({ where: { id: "cat_salary" }, update: {}, create: { id: "cat_salary", name: "Salário", icon: "💼", color: "#10b981", type: "INCOME", userId: user.id, isDefault: true } }),
    prisma.category.upsert({ where: { id: "cat_freelance" }, update: {}, create: { id: "cat_freelance", name: "Freelance", icon: "💻", color: "#10b981", type: "INCOME", userId: user.id, isDefault: true } }),
    prisma.category.upsert({ where: { id: "cat_food" }, update: {}, create: { id: "cat_food", name: "Alimentação", icon: "🛒", color: "#f59e0b", type: "EXPENSE", userId: user.id, isDefault: true } }),
    prisma.category.upsert({ where: { id: "cat_housing" }, update: {}, create: { id: "cat_housing", name: "Moradia", icon: "🏠", color: "#ef4444", type: "EXPENSE", userId: user.id, isDefault: true } }),
    prisma.category.upsert({ where: { id: "cat_transport" }, update: {}, create: { id: "cat_transport", name: "Transporte", icon: "🚗", color: "#3b82f6", type: "EXPENSE", userId: user.id, isDefault: true } }),
    prisma.category.upsert({ where: { id: "cat_health" }, update: {}, create: { id: "cat_health", name: "Saúde", icon: "💊", color: "#14b8a6", type: "EXPENSE", userId: user.id, isDefault: true } }),
    prisma.category.upsert({ where: { id: "cat_subs" }, update: {}, create: { id: "cat_subs", name: "Assinaturas", icon: "📺", color: "#8b5cf6", type: "EXPENSE", userId: user.id, isDefault: true } }),
    prisma.category.upsert({ where: { id: "cat_invest" }, update: {}, create: { id: "cat_invest", name: "Investimentos", icon: "📈", color: "#6366f1", type: "EXPENSE", userId: user.id, isDefault: true } }),
  ]);

  // Accounts
  const nubank = await prisma.financialAccount.upsert({
    where: { id: "acc_nubank" },
    update: {},
    create: { id: "acc_nubank", name: "Nubank", type: "CHECKING", balance: 5240.80, color: "#8b5cf6", icon: "💳", userId: user.id },
  });

  const itau = await prisma.financialAccount.upsert({
    where: { id: "acc_itau" },
    update: {},
    create: { id: "acc_itau", name: "Itaú", type: "CHECKING", balance: 12800.00, color: "#ef4444", icon: "🏦", userId: user.id },
  });

  // Transactions (current month)
  const now = new Date();
  const txData = [
    { title: "Salário", amount: 8500, type: "INCOME" as const, categoryId: "cat_salary", date: new Date(now.getFullYear(), now.getMonth(), 5) },
    { title: "Freelance Design", amount: 2200, type: "INCOME" as const, categoryId: "cat_freelance", date: new Date(now.getFullYear(), now.getMonth(), 15) },
    { title: "Aluguel", amount: 1800, type: "EXPENSE" as const, categoryId: "cat_housing", date: new Date(now.getFullYear(), now.getMonth(), 7) },
    { title: "Supermercado", amount: 450.90, type: "EXPENSE" as const, categoryId: "cat_food", date: new Date(now.getFullYear(), now.getMonth(), 10) },
    { title: "Combustível", amount: 220, type: "EXPENSE" as const, categoryId: "cat_transport", date: new Date(now.getFullYear(), now.getMonth(), 17) },
    { title: "Netflix", amount: 39.90, type: "EXPENSE" as const, categoryId: "cat_subs", date: new Date(now.getFullYear(), now.getMonth(), 12) },
    { title: "Academia", amount: 99.90, type: "EXPENSE" as const, categoryId: "cat_health", date: new Date(now.getFullYear(), now.getMonth(), 18) },
    { title: "Investimento CDB", amount: 1000, type: "EXPENSE" as const, categoryId: "cat_invest", date: new Date(now.getFullYear(), now.getMonth(), 25) },
    { title: "Restaurante", amount: 180.50, type: "EXPENSE" as const, categoryId: "cat_food", date: new Date(now.getFullYear(), now.getMonth(), 20) },
    { title: "Spotify", amount: 21.90, type: "EXPENSE" as const, categoryId: "cat_subs", date: new Date(now.getFullYear(), now.getMonth(), 22) },
  ];

  for (const tx of txData) {
    await prisma.transaction.create({
      data: { ...tx, status: "COMPLETED", userId: user.id, tags: [] },
    });
  }

  // Goals
  await prisma.goal.createMany({
    data: [
      { title: "Reserva de Emergência", description: "6 meses de gastos", targetAmount: 30000, currentAmount: 18500, type: "EMERGENCY_FUND", color: "#10b981", icon: "🛡️", userId: user.id },
      { title: "Viagem para Europa", description: "Portugal e Espanha", targetAmount: 15000, currentAmount: 6200, type: "SAVINGS", color: "#3b82f6", icon: "✈️", userId: user.id },
    ],
  });

  console.log("✅ Seed concluído!");
  console.log("📧 Login demo: demo@financeos.app");
  console.log("🔑 Senha demo: demo123456");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
