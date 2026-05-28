"use client";

import { motion } from "framer-motion";
import { Plus, Target, Trophy, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate, formatPercentage, calculatePercentage } from "@/lib/utils";
import { mockGoals } from "@/lib/mock-data";

export default function GoalsPage() {
  const completed = mockGoals.filter((g) => calculatePercentage(g.currentAmount, g.targetAmount) >= 100);
  const inProgress = mockGoals.filter((g) => calculatePercentage(g.currentAmount, g.targetAmount) < 100);

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
        <Button variant="premium" size="sm">
          <Plus className="w-4 h-4" />
          Nova Meta
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <Trophy className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold">{completed.length}</p>
          <p className="text-sm text-muted-foreground">Metas concluídas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
            <Target className="w-4.5 h-4.5 text-violet-400" />
          </div>
          <p className="text-2xl font-bold">{inProgress.length}</p>
          <p className="text-sm text-muted-foreground">Em andamento</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <TrendingUp className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold">
            {formatCurrency(mockGoals.reduce((a, b) => a + b.currentAmount, 0))}
          </p>
          <p className="text-sm text-muted-foreground">Total guardado</p>
        </div>
      </div>

      {/* Goals grid */}
      <div className="grid md:grid-cols-2 gap-5">
        {mockGoals.map((goal, i) => {
          const pct = calculatePercentage(goal.currentAmount, goal.targetAmount);
          const completed = pct >= 100;
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

          return (
            <motion.div
              key={goal.id}
              className={cn(
                "rounded-xl border p-6 hover:shadow-md transition-all duration-300 cursor-pointer",
                completed
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-card"
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: goal.color + "20" }}
                  >
                    {goal.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{goal.title}</h3>
                    <p className="text-xs text-muted-foreground">{goal.description}</p>
                  </div>
                </div>
                {completed ? (
                  <Badge variant="success">
                    <Trophy className="w-3 h-3 mr-1" />
                    Concluída!
                  </Badge>
                ) : (
                  goal.deadline && (
                    <Badge variant="outline" className="text-xs">
                      {formatDate(goal.deadline)}
                    </Badge>
                  )
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-semibold">{formatPercentage(pct, 0)}</span>
                </div>
                <Progress
                  value={pct}
                  className="h-2.5"
                  indicatorClassName={completed ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : undefined}
                  style={{ "--progress-color": goal.color } as React.CSSProperties}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Guardado</p>
                  <p className="text-sm font-semibold text-emerald-400">
                    {formatCurrency(goal.currentAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Meta</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(goal.targetAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Faltam</p>
                  <p className={cn("text-sm font-semibold", completed ? "text-emerald-400" : "text-muted-foreground")}>
                    {completed ? "Meta atingida!" : formatCurrency(remaining)}
                  </p>
                </div>
              </div>

              {!completed && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  style={{ borderColor: goal.color + "40", color: goal.color }}
                >
                  Adicionar valor
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
