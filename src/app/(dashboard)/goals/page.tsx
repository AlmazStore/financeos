"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Target, Trophy, TrendingUp, Loader2, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { notifyDataChanged } from "@/lib/events";
import { CreateGoalDialog, AddValueDialog } from "@/components/dashboard/goal-dialogs";
import { cn, formatCurrency, formatDate, formatPercentage, calculatePercentage } from "@/lib/utils";

type Goal = {
  id: string;
  title: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  color: string | null;
  icon: string | null;
};

export default function GoalsPage() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => setGoals(d.goals ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setGoals((prev) => prev.filter((g) => g.id !== id));
      toast("Meta excluída.", "success");
      notifyDataChanged();
    } catch {
      toast("Erro ao excluir.", "error");
    }
  };

  const completed = goals.filter((g) => calculatePercentage(g.currentAmount, g.targetAmount) >= 100);
  const inProgress = goals.filter((g) => calculatePercentage(g.currentAmount, g.targetAmount) < 100);
  const totalSaved = goals.reduce((a, b) => a + b.currentAmount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Metas Financeiras</h2>
          <p className="text-sm text-muted-foreground">
            {completed.length} concluídas · {inProgress.length} em andamento
          </p>
        </div>
        <CreateGoalDialog onCreated={load} />
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Target}
            title="Nenhuma meta ainda"
            description="Defina objetivos financeiros como reserva de emergência, uma viagem ou quitar dívidas. Ter metas claras é o que transforma intenção em resultado."
            action={<CreateGoalDialog onCreated={load} />}
          />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="rounded-xl border border-border bg-card p-3 sm:p-5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                <Trophy className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-lg sm:text-2xl font-bold">{completed.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Metas concluídas</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 sm:p-5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
                <Target className="w-4 h-4 text-violet-400" />
              </div>
              <p className="text-lg sm:text-2xl font-bold">{inProgress.length}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Em andamento</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 sm:p-5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-base sm:text-2xl font-bold truncate">{formatCurrency(totalSaved)}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total guardado</p>
            </div>
          </div>

          {/* Goals grid */}
          <div className="grid md:grid-cols-2 gap-5">
            {goals.map((goal, i) => {
              const pct = calculatePercentage(goal.currentAmount, goal.targetAmount);
              const isCompleted = pct >= 100;
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

              return (
                <motion.div
                  key={goal.id}
                  className={cn(
                    "rounded-xl border p-6 transition-all duration-300 group",
                    isCompleted ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.08, 0.4) }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: (goal.color ?? "#10b981") + "20" }}>
                        {goal.icon ?? "🎯"}
                      </div>
                      <div>
                        <h3 className="font-semibold">{goal.title}</h3>
                        {goal.description && <p className="text-xs text-muted-foreground">{goal.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <Badge variant="success"><Trophy className="w-3 h-3 mr-1" />Concluída!</Badge>
                      ) : (
                        goal.deadline && <Badge variant="outline" className="text-xs">{formatDate(new Date(goal.deadline))}</Badge>
                      )}
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">{formatPercentage(pct, 0)}</span>
                    </div>
                    <Progress value={pct} className="h-2.5" indicatorClassName={isCompleted ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : undefined} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Guardado</p>
                      <p className="text-sm font-semibold text-emerald-400">{formatCurrency(goal.currentAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Meta</p>
                      <p className="text-sm font-semibold">{formatCurrency(goal.targetAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Faltam</p>
                      <p className={cn("text-sm font-semibold", isCompleted ? "text-emerald-400" : "text-muted-foreground")}>
                        {isCompleted ? "Atingida!" : formatCurrency(remaining)}
                      </p>
                    </div>
                  </div>

                  {!isCompleted && (
                    <AddValueDialog goalId={goal.id} goalTitle={goal.title} onDone={load} />
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
