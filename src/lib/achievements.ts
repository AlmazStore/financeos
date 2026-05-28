import { db } from "@/lib/db";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  unit: "count" | "money" | "flag";
  current: number;
  target: number;
  unlocked: boolean;
  progress: number; // 0-100
};

export type AchievementsResult = {
  achievements: Achievement[];
  summary: { unlocked: number; total: number; completedGoals: number; totalAchieved: number };
};

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function computeAchievements(userId: string): Promise<AchievementsResult> {
  const goals = await db.goal.findMany({ where: { userId } });

  const completed = goals.filter((g) => g.isCompleted || (g.targetAmount > 0 && g.currentAmount >= g.targetAmount));
  const completedCount = completed.length;
  const totalAchieved = completed.reduce((a, g) => a + g.targetAmount, 0);
  const biggestCompleted = completed.reduce((m, g) => Math.max(m, g.targetAmount), 0);
  const onTimeCount = completed.filter((g) => g.deadline && new Date(g.updatedAt) <= new Date(g.deadline)).length;
  const totalSaved = goals.reduce((a, g) => a + g.currentAmount, 0);

  const defs: Omit<Achievement, "unlocked" | "progress">[] = [
    // Count of completed goals
    { id: "first", title: "Primeiro passo", description: "Conclua sua primeira meta", icon: "🎯", tier: "bronze", unit: "count", current: completedCount, target: 1 },
    { id: "trio", title: "Trio de vitórias", description: "Conclua 3 metas", icon: "🥉", tier: "bronze", unit: "count", current: completedCount, target: 3 },
    { id: "collector", title: "Colecionador", description: "Conclua 5 metas", icon: "🥈", tier: "silver", unit: "count", current: completedCount, target: 5 },
    { id: "master", title: "Mestre das metas", description: "Conclua 10 metas", icon: "🥇", tier: "gold", unit: "count", current: completedCount, target: 10 },
    // Total value achieved (sum of completed goals' targets)
    { id: "v1k", title: "Primeiros R$ 1.000", description: `Conquiste ${BRL(1000)} em metas batidas`, icon: "💵", tier: "bronze", unit: "money", current: totalAchieved, target: 1000 },
    { id: "v5k", title: "R$ 5.000 conquistados", description: `Conquiste ${BRL(5000)} em metas batidas`, icon: "💰", tier: "silver", unit: "money", current: totalAchieved, target: 5000 },
    { id: "v10k", title: "R$ 10.000 conquistados", description: `Conquiste ${BRL(10000)} em metas batidas`, icon: "🏦", tier: "gold", unit: "money", current: totalAchieved, target: 10000 },
    { id: "v50k", title: "R$ 50.000 conquistados", description: `Conquiste ${BRL(50000)} em metas batidas`, icon: "💎", tier: "diamond", unit: "money", current: totalAchieved, target: 50000 },
    // Special
    { id: "big", title: "Grande conquista", description: `Conclua uma meta de ${BRL(10000)} ou mais`, icon: "🚀", tier: "gold", unit: "money", current: biggestCompleted, target: 10000 },
    { id: "ontime", title: "No prazo", description: "Conclua uma meta antes do prazo", icon: "⏱️", tier: "silver", unit: "flag", current: onTimeCount, target: 1 },
  ];

  const achievements: Achievement[] = defs.map((d) => {
    const unlocked = d.current >= d.target;
    const progress = Math.max(0, Math.min(100, Math.round((d.current / d.target) * 100)));
    return { ...d, unlocked, progress };
  });

  return {
    achievements,
    summary: {
      unlocked: achievements.filter((a) => a.unlocked).length,
      total: achievements.length,
      completedGoals: completedCount,
      totalAchieved: totalSaved,
    },
  };
}
