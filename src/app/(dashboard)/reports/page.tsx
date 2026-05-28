"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { BarChart3, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover p-3 shadow-xl text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};
/* eslint-enable @typescript-eslint/no-explicit-any */

type ReportData = {
  monthlyData: { month: string; income: number; expenses: number; savings: number }[];
  categoryData: { name: string; value: number; color: string; percentage: number }[];
  dre: { label: string; value: number; type: string }[];
  summary: { income: number; expenses: number; savings: number };
  monthLabel: string;
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>;
  }

  const hasData = (data?.monthlyData?.some((m) => m.income > 0 || m.expenses > 0)) ?? false;
  const comparison = (data?.monthlyData ?? []).slice(-3).map((m) => ({
    month: m.month, Entradas: m.income, Saídas: m.expenses, Economia: m.savings,
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Relatórios</h2>
          <p className="text-sm text-muted-foreground">Análise completa do seu financeiro</p>
        </div>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={BarChart3}
            title="Sem dados para relatórios ainda"
            description="Os relatórios são gerados a partir das suas transações. Registre suas entradas e saídas para ver gráficos de evolução, gastos por categoria e o DRE."
            action={<Button variant="premium" asChild><Link href="/transactions/new">Adicionar transação</Link></Button>}
          />
        </div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="dre">DRE</TabsTrigger>
            <TabsTrigger value="comparison">Comparativo</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid xl:grid-cols-2 gap-6">
              <motion.div className="rounded-xl border border-border bg-card p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h3 className="font-semibold mb-1">Evolução Financeira</h3>
                <p className="text-sm text-muted-foreground mb-5">Últimos 7 meses</p>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data?.monthlyData ?? []}>
                    <defs>
                      <linearGradient id="incomeGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="income" name="Entradas" stroke="#10b981" fill="url(#incomeGrad2)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="expenses" name="Saídas" stroke="#ef4444" fill="url(#expenseGrad2)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="savings" name="Economia" stroke="#8b5cf6" fill="url(#savingsGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div className="rounded-xl border border-border bg-card p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <h3 className="font-semibold mb-1">Economia por Mês</h3>
                <p className="text-sm text-muted-foreground mb-5">Quanto sobrou cada mês</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data?.monthlyData ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Bar dataKey="savings" name="Economia" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="categories">
            {(data?.categoryData?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-border bg-card py-12 text-center">
                <p className="text-sm text-muted-foreground">Sem despesas registradas este mês.</p>
              </div>
            ) : (
              <div className="grid xl:grid-cols-2 gap-6">
                <motion.div className="rounded-xl border border-border bg-card p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 className="font-semibold mb-5">Gastos por Categoria</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={data?.categoryData ?? []} cx="50%" cy="50%" outerRadius={120} paddingAngle={3} dataKey="value" labelLine={false}>
                        {(data?.categoryData ?? []).map((entry, i) => (
                          <Cell key={i} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>

                <motion.div className="rounded-xl border border-border bg-card p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                  <h3 className="font-semibold mb-5">Detalhamento</h3>
                  <div className="space-y-4">
                    {(data?.categoryData ?? []).map((cat) => (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span>{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{cat.percentage}%</span>
                            <span className="font-semibold">{formatCurrency(cat.value)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="dre">
            <div className="max-w-xl">
              <motion.div className="rounded-xl border border-border bg-card overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                  <h3 className="font-semibold">DRE Simplificado</h3>
                  <p className="text-sm text-muted-foreground capitalize">{data?.monthLabel}</p>
                </div>
                <div className="divide-y divide-border">
                  {(data?.dre ?? []).map((row) => (
                    <div key={row.label} className={cn(
                      "flex items-center justify-between px-6 py-3",
                      row.type === "subtotal" && "bg-muted/20 font-semibold",
                      row.type === "result" && "bg-emerald-500/5 font-bold"
                    )}>
                      <span className={cn("text-sm", row.type === "deduction" && "text-muted-foreground pl-4")}>{row.label}</span>
                      <span className={cn("text-sm", row.value < 0 ? "text-red-400" : row.type === "result" ? "text-emerald-400" : "")}>
                        {row.value < 0 ? `(${formatCurrency(Math.abs(row.value))})` : formatCurrency(row.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <motion.div className="rounded-xl border border-border bg-card p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 className="font-semibold mb-5">Comparativo — Últimos 3 Meses</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparison} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Economia" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
