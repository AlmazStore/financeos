"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  HeartPulse, Loader2, TrendingUp, Lightbulb,
  AlertTriangle, CheckCircle2, Info, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatCurrency } from "@/lib/utils";
import { useAutoRefresh } from "@/lib/events";

type Indicator = { key: string; label: string; value: string; hint: string; status: "good" | "warning" | "bad" | "neutral"; progress?: number };
type Tip = { id: string; title: string; text: string; priority: "high" | "medium" | "low" };
type Health = {
  hasData: boolean;
  score: number;
  rating: string;
  breakdown: { label: string; points: number; max: number }[];
  indicators: Indicator[];
  rule503020: { needs: number; wants: number; savings: number; needsPct: number; wantsPct: number; savingsPct: number };
  tips: Tip[];
  summary: { income: number; expenses: number; savings: number; savingsRate: number; totalBalance: number; emergencyMonths: number };
};

const SCORE_COLOR = (s: number) => (s >= 80 ? "#10b981" : s >= 60 ? "#3b82f6" : s >= 40 ? "#f59e0b" : "#ef4444");
const STATUS_COLOR: Record<string, string> = {
  good: "text-emerald-400", warning: "text-yellow-400", bad: "text-red-400", neutral: "text-muted-foreground",
};
const BAR_COLOR: Record<string, string> = {
  good: "bg-emerald-500", warning: "bg-yellow-500", bad: "bg-red-500", neutral: "bg-violet-500",
};

function ScoreGauge({ score, rating }: { score: number; rating: string }) {
  const color = SCORE_COLOR(score);
  const r = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative w-[180px] h-[180px] flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
        <motion.circle
          cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground">de 100</span>
        <span className="text-sm font-semibold mt-1" style={{ color }}>{rating}</span>
      </div>
    </div>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/health").then((r) => r.json()).then((d) => setData(d)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>;
  }

  if (!data?.hasData) {
    return (
      <div className="p-4 sm:p-6 max-w-[1100px]">
        <h2 className="text-xl font-bold mb-4">Saúde Financeira</h2>
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={HeartPulse}
            title="Sem dados para analisar ainda"
            description="Sua nota de saúde financeira é calculada a partir das suas transações reais. Registre o extrato do mês para ver seu diagnóstico completo."
            action={<Button variant="premium" asChild><Link href="/transactions/import">Importar extrato</Link></Button>}
          />
        </div>
      </div>
    );
  }

  const { rule503020: r } = data;
  const bars = [
    { label: "Essenciais", pct: r.needsPct, ideal: 50, value: r.needs, color: "bg-blue-500" },
    { label: "Desejos", pct: r.wantsPct, ideal: 30, value: r.wants, color: "bg-orange-500" },
    { label: "Poupança/Invest.", pct: r.savingsPct, ideal: 20, value: r.savings, color: "bg-emerald-500" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1100px]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
          <HeartPulse className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Saúde Financeira</h2>
          <p className="text-sm text-muted-foreground">Diagnóstico baseado nos seus dados reais</p>
        </div>
      </div>

      {/* Score + breakdown */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <ScoreGauge score={data.score} rating={data.rating} />
          <div className="flex-1 w-full space-y-3">
            <p className="text-sm text-muted-foreground mb-1">Como sua nota é composta:</p>
            {data.breakdown.map((b) => (
              <div key={b.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{b.label}</span>
                  <span className="text-muted-foreground">{b.points}/{b.max} pts</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${(b.points / b.max) * 100}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Indicators */}
      <div>
        <h3 className="font-semibold mb-3">Indicadores</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.indicators.map((ind) => (
            <motion.div
              key={ind.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{ind.label}</p>
                {ind.status === "good" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {ind.status === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                {ind.status === "bad" && <AlertTriangle className="w-4 h-4 text-red-400" />}
              </div>
              <p className={cn("text-lg font-bold truncate", STATUS_COLOR[ind.status])}>{ind.value}</p>
              {ind.progress !== undefined && (
                <div className="h-1.5 rounded-full bg-muted overflow-hidden my-2">
                  <div className={cn("h-full rounded-full", BAR_COLOR[ind.status])} style={{ width: `${Math.min(100, ind.progress)}%` }} />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground leading-snug">{ind.hint}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 50/30/20 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">Regra 50 / 30 / 20</h3>
          <span className="text-xs text-muted-foreground">do seu mês</span>
        </div>
        <p className="text-xs text-muted-foreground mb-5">Como sua renda foi distribuída vs. o ideal recomendado.</p>
        <div className="space-y-4">
          {bars.map((b) => {
            const ok = b.label === "Poupança/Invest." ? b.pct >= b.ideal : b.pct <= b.ideal;
            return (
              <div key={b.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{b.label}</span>
                  <span className={cn(ok ? "text-emerald-400" : "text-yellow-400")}>
                    {b.pct}% <span className="text-muted-foreground">(ideal {b.ideal}%)</span> · {formatCurrency(b.value)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden relative">
                  <div className={cn("h-full rounded-full", b.color)} style={{ width: `${Math.min(100, b.pct)}%` }} />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/40" style={{ left: `${b.ideal}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tips */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <h3 className="font-semibold">Dicas personalizadas para você</h3>
        </div>
        <div className="space-y-3">
          {data.tips.map((tip, i) => {
            const cfg = {
              high: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/5 border-red-500/20" },
              medium: { icon: Info, color: "text-yellow-400", bg: "bg-yellow-500/5 border-yellow-500/20" },
              low: { icon: Lightbulb, color: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/20" },
            }[tip.priority];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={tip.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn("rounded-xl border p-4 flex items-start gap-3", cfg.bg)}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", cfg.color)} />
                <div>
                  <p className="text-sm font-semibold">{tip.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip.text}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CTA to budgets */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center gap-4">
        <TrendingUp className="w-6 h-6 text-emerald-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Defina orçamentos para controlar melhor</p>
          <p className="text-xs text-muted-foreground">Estabeleça um limite mensal por categoria e receba alertas ao se aproximar.</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/budgets">Criar orçamento <ArrowRight className="w-3.5 h-3.5" /></Link>
        </Button>
      </div>
    </div>
  );
}
