"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Loader2, Lock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAutoRefresh } from "@/lib/events";
import { cn, formatCurrency } from "@/lib/utils";

type Achievement = {
  id: string; title: string; description: string; icon: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  unit: "count" | "money" | "flag"; current: number; target: number; unlocked: boolean; progress: number;
};
type Data = {
  achievements: Achievement[];
  summary: { unlocked: number; total: number; completedGoals: number; totalAchieved: number };
};

const TIER: Record<string, { ring: string; bg: string; label: string }> = {
  bronze: { ring: "ring-amber-700/40", bg: "from-amber-700/20 to-amber-600/5", label: "Bronze" },
  silver: { ring: "ring-slate-400/40", bg: "from-slate-400/20 to-slate-300/5", label: "Prata" },
  gold: { ring: "ring-yellow-500/50", bg: "from-yellow-500/20 to-yellow-400/5", label: "Ouro" },
  diamond: { ring: "ring-cyan-400/50", bg: "from-cyan-400/20 to-violet-400/5", label: "Diamante" },
};

function progressText(a: Achievement) {
  if (a.unit === "money") return `${formatCurrency(Math.min(a.current, a.target))} / ${formatCurrency(a.target)}`;
  if (a.unit === "flag") return a.unlocked ? "Desbloqueado" : "Bloqueado";
  return `${Math.min(a.current, a.target)} / ${a.target}`;
}

export default function AchievementsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/achievements").then((r) => r.json()).then((d) => setData(d)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>;
  }

  const s = data?.summary;
  const unlocked = (data?.achievements ?? []).filter((a) => a.unlocked);
  const locked = (data?.achievements ?? []).filter((a) => !a.unlocked);

  const Card = ({ a }: { a: Achievement }) => {
    const t = TIER[a.tier];
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "rounded-2xl border p-5 text-center relative overflow-hidden",
          a.unlocked ? `border-transparent ring-1 ${t.ring} bg-gradient-to-b ${t.bg}` : "border-border bg-card"
        )}
      >
        <div className={cn("w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3",
          a.unlocked ? "bg-background/40" : "bg-muted grayscale opacity-50")}>
          {a.unlocked ? a.icon : <Lock className="w-6 h-6 text-muted-foreground" />}
        </div>
        <p className={cn("text-sm font-bold", !a.unlocked && "text-muted-foreground")}>{a.title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-snug min-h-[32px]">{a.description}</p>

        {!a.unlocked && a.unit !== "flag" && (
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${a.progress}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{progressText(a)}</p>
          </div>
        )}
        {a.unlocked && (
          <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-background/50 font-semibold">{t.label} · conquistado</span>
        )}
      </motion.div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1100px]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Conquistas</h2>
          <p className="text-sm text-muted-foreground">Suas vitórias financeiras</p>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{s?.unlocked ?? 0}<span className="text-base text-muted-foreground font-normal">/{s?.total ?? 0}</span></p>
            <p className="text-xs text-muted-foreground mt-1">Conquistas</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold">{s?.completedGoals ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Metas batidas</p>
          </div>
          <div>
            <p className="text-base sm:text-3xl font-bold text-emerald-400 truncate">{formatCurrency(s?.totalAchieved ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total guardado</p>
          </div>
        </div>
      </div>

      {(s?.completedGoals ?? 0) === 0 && unlocked.length === 0 && (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Target}
            title="Nenhuma conquista ainda"
            description="Conclua sua primeira meta para desbloquear conquistas. Cada meta batida e cada valor acumulado vira um troféu aqui."
            action={<Button variant="premium" asChild><Link href="/goals">Ver minhas metas</Link></Button>}
          />
        </div>
      )}

      {unlocked.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Desbloqueadas ({unlocked.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {unlocked.map((a) => <Card key={a.id} a={a} />)}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 text-muted-foreground">A conquistar ({locked.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {locked.map((a) => <Card key={a.id} a={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}
