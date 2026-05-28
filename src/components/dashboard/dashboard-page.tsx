"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Area, AreaChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  Bot, PiggyBank, TrendingDown, TrendingUp, Wallet, Loader2,
  ArrowRight, Sparkles, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/stat-card";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { AddAccountDialog } from "@/components/dashboard/add-account-dialog";
import { cn, formatCurrency, formatDate, formatPercentage, calculatePercentage } from "@/lib/utils";
import { useAutoRefresh } from "@/lib/events";

/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover p-3 shadow-xl text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

const PieCustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover p-3 shadow-xl text-sm">
      <p className="font-semibold">{payload[0].name}</p>
      <p className="text-muted-foreground">{formatCurrency(payload[0].value)}</p>
      <p className="text-xs text-muted-foreground">{payload[0].payload.percentage}%</p>
    </div>
  );
};
/* eslint-enable @typescript-eslint/no-explicit-any */

type DashboardData = {
  summary: {
    totalBalance: number;
    currentIncome: number;
    currentExpenses: number;
    savings: number;
    incomeChange: number;
    expensesChange: number;
    cancelledTotal: number;
    cancelledCount: number;
  };
  monthlyData: { month: string; income: number; expenses: number; savings: number }[];
  categoryData: { id: string; name: string; value: number; color: string; icon: string; percentage: number }[];
  recentTransactions: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  goals: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  accounts: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/dashboard/summary")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasTransactions = (data?.recentTransactions?.length ?? 0) > 0;
  const hasGoals = (data?.goals?.length ?? 0) > 0;
  const hasAccounts = (data?.accounts?.length ?? 0) > 0;
  const isEmpty = !hasTransactions && !hasAccounts && !hasGoals;

  const summary = data?.summary ?? {
    totalBalance: 0, currentIncome: 0, currentExpenses: 0, savings: 0, incomeChange: 0, expensesChange: 0,
    cancelledTotal: 0, cancelledCount: 0,
  };

  return (
    <div className="space-y-6 max-w-[1600px]">
      <WelcomeBanner />
      <div className="px-4 sm:px-6 space-y-6 pb-6 pt-6">
        {/* Greeting */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h2 className="text-xl font-bold">{greeting()}{firstName ? `, ${firstName}` : ""} 👋</h2>
            <p className="text-sm text-muted-foreground">
              {isEmpty ? "Vamos configurar seu controle financeiro" : "Aqui está um resumo do seu mês financeiro"}
            </p>
          </div>
          {!isEmpty && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/ai">
                <Bot className="w-3.5 h-3.5" />
                Insights IA
              </Link>
            </Button>
          )}
        </motion.div>

        {/* Getting started guide (only when there's some data missing but user started) */}
        {isEmpty ? (
          <GettingStarted hasTransactions={hasTransactions} hasGoals={hasGoals} />
        ) : (
          <>
            {/* Show compact getting-started if partial */}
            {(!hasTransactions || !hasGoals) && (
              <GettingStarted hasTransactions={hasTransactions} hasGoals={hasGoals} />
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="Saldo Total"
                value={summary.totalBalance}
                variant="default"
                icon={<Wallet className="w-4 h-4 text-muted-foreground" />}
                delay={0}
              />
              <StatCard
                title="Entradas do Mês"
                value={summary.currentIncome}
                change={Math.round(summary.incomeChange * 10) / 10}
                variant="income"
                icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
                delay={0.1}
              />
              <StatCard
                title="Saídas do Mês"
                value={summary.currentExpenses}
                change={Math.round(summary.expensesChange * 10) / 10}
                variant="expense"
                icon={<TrendingDown className="w-4 h-4 text-red-400" />}
                delay={0.2}
              />
              <StatCard
                title="Sobrou no mês"
                value={summary.savings}
                variant="neutral"
                icon={<PiggyBank className="w-4 h-4 text-violet-400" />}
                delay={0.3}
              />
            </div>

            {/* Pix cancelado */}
            {summary.cancelledCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Pix cancelado</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.cancelledCount} {summary.cancelledCount === 1 ? "transação cancelada" : "transações canceladas"} este mês — não entram nas saídas
                  </p>
                </div>
                <p className="text-lg font-bold text-amber-400 flex-shrink-0">{formatCurrency(summary.cancelledTotal)}</p>
              </motion.div>
            )}

            {/* Charts row */}
            <div className="grid xl:grid-cols-3 gap-6">
              {/* Main chart */}
              <motion.div
                className="xl:col-span-2 rounded-xl border border-border bg-card p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="mb-6">
                  <h3 className="font-semibold">Evolução Financeira</h3>
                  <p className="text-sm text-muted-foreground">Entradas vs. Saídas (últimos 7 meses)</p>
                </div>

                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data?.monthlyData ?? []}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="income" name="Entradas" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="expenses" name="Saídas" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Category pie */}
              <motion.div
                className="rounded-xl border border-border bg-card p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="mb-4">
                  <h3 className="font-semibold">Por Categoria</h3>
                  <p className="text-sm text-muted-foreground">Distribuição de gastos do mês</p>
                </div>

                {(data?.categoryData?.length ?? 0) === 0 ? (
                  <div className="h-[180px] flex items-center justify-center text-center">
                    <p className="text-sm text-muted-foreground">Sem gastos registrados este mês.</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={data?.categoryData ?? []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {(data?.categoryData ?? []).map((entry, i) => (
                            <Cell key={i} fill={entry.color} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieCustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="space-y-2 mt-2">
                      {(data?.categoryData ?? []).slice(0, 5).map((cat) => (
                        <div key={cat.id} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-xs text-muted-foreground flex-1 truncate">{cat.name}</span>
                          <span className="text-xs font-medium">{cat.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </div>

            {/* Bottom row */}
            <div className="grid xl:grid-cols-2 gap-6">
              {/* Recent transactions */}
              <motion.div
                className="rounded-xl border border-border bg-card p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Transações Recentes</h3>
                    <p className="text-sm text-muted-foreground">Últimas movimentações</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs" asChild>
                    <Link href="/transactions">Ver todas</Link>
                  </Button>
                </div>

                {!hasTransactions ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Nenhuma transação ainda.</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/transactions/new">Adicionar primeira</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data?.recentTransactions.slice(0, 7).map((t) => (
                      <div key={t.id} className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                          style={{ backgroundColor: (t.category?.color ?? "#84cc16") + "20" }}
                        >
                          {t.category?.icon ?? "📦"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(new Date(t.date))}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("text-sm font-semibold", t.type === "INCOME" ? "text-emerald-400" : "text-foreground")}>
                            {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                          </p>
                          {t.status === "PENDING" && <span className="text-[10px] text-yellow-400">Pendente</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Goals */}
              <motion.div
                className="rounded-xl border border-border bg-card p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Metas Financeiras</h3>
                    <p className="text-sm text-muted-foreground">Acompanhe seus objetivos</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs" asChild>
                    <Link href="/goals">Ver metas</Link>
                  </Button>
                </div>

                {!hasGoals ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Você ainda não tem metas.</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/goals">Criar primeira meta</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data?.goals.map((goal) => {
                      const pct = calculatePercentage(goal.currentAmount, goal.targetAmount);
                      const completed = pct >= 100;
                      return (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{goal.icon ?? "🎯"}</span>
                              <span className="text-sm font-medium">{goal.title}</span>
                            </div>
                            <span className={cn("text-xs font-medium", completed ? "text-emerald-400" : "text-muted-foreground")}>
                              {formatPercentage(pct, 0)}
                            </span>
                          </div>
                          <Progress value={pct} className="h-1.5" indicatorClassName={completed ? "bg-emerald-500" : undefined} />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatCurrency(goal.currentAmount)}</span>
                            <span>{formatCurrency(goal.targetAmount)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Accounts row */}
            <motion.div
              className="rounded-xl border border-border bg-card p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Contas e Carteiras</h3>
                  <p className="text-sm text-muted-foreground">Seu patrimônio distribuído</p>
                </div>
                <AddAccountDialog onCreated={load} />
              </div>

              {!hasAccounts ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Cadastre suas contas para acompanhar o saldo total.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {data?.accounts.map((account) => (
                    <div key={account.id} className="rounded-xl border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: (account.color ?? "#8b5cf6") + "20" }}>
                          {account.icon ?? "🏦"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{account.type.toLowerCase().replace("_", " ")}</p>
                        </div>
                      </div>
                      <p className={cn("text-lg font-bold", account.balance < 0 ? "text-red-400" : "text-foreground")}>
                        {formatCurrency(account.balance)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* AI teaser */}
            <motion.div
              className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Análise inteligente das suas finanças</h3>
                  <p className="text-xs text-muted-foreground">A IA analisa seus gastos reais e mostra onde economizar.</p>
                </div>
                <Button variant="purple" size="sm" asChild>
                  <Link href="/ai">
                    Abrir IA
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
