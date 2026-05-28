"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  AlertTriangle, ArrowRight, Bot, CreditCard, DollarSign,
  Lightbulb, Percent, PiggyBank, Target, TrendingDown,
  TrendingUp, Wallet, Zap, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  cn, formatCurrency, formatDate, formatPercentage,
  calculatePercentage,
} from "@/lib/utils";
import {
  mockMonthlyData, mockCategoryData, mockTransactions,
  mockGoals, mockAccounts, mockBudgets, mockInsights,
  mockWeeklyData,
} from "@/lib/mock-data";

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

function InsightCard({ insight }: { insight: typeof mockInsights[0] }) {
  const config = {
    warning: { bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: AlertTriangle, color: "text-yellow-400" },
    success: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2, color: "text-emerald-400" },
    info: { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Lightbulb, color: "text-blue-400" },
    alert: { bg: "bg-red-500/10", border: "border-red-500/20", icon: AlertTriangle, color: "text-red-400" },
  };
  const c = config[insight.type as keyof typeof config];
  const Icon = c.icon;

  return (
    <div className={cn("rounded-xl border p-4 flex gap-3", c.bg, c.border)}>
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={cn("w-4 h-4", c.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-0.5">{insight.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
        <button className={cn("text-xs font-medium mt-2 flex items-center gap-1", c.color)}>
          {insight.action} <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [chartPeriod, setChartPeriod] = useState<"monthly" | "weekly">("monthly");

  const totalBalance = mockAccounts.reduce((a, b) => a + b.balance, 0);
  const totalIncome = mockTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((a, b) => a + b.amount, 0);
  const totalExpenses = mockTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((a, b) => a + b.amount, 0);
  const savings = totalIncome - totalExpenses;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px]">
      {/* Welcome bar */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-xl font-bold">Bom dia, Rafael 👋</h2>
          <p className="text-sm text-muted-foreground">
            Aqui está um resumo do seu mês financeiro
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Tudo em dia
          </Badge>
          <Button variant="outline" size="sm">
            <Bot className="w-3.5 h-3.5" />
            Insights IA
          </Button>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Total"
          value={totalBalance}
          change={12.4}
          variant="default"
          icon={<Wallet className="w-4 h-4 text-muted-foreground" />}
          delay={0}
        />
        <StatCard
          title="Entradas do Mês"
          value={totalIncome}
          change={8.2}
          variant="income"
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          delay={0.1}
        />
        <StatCard
          title="Saídas do Mês"
          value={totalExpenses}
          change={-3.1}
          variant="expense"
          icon={<TrendingDown className="w-4 h-4 text-red-400" />}
          delay={0.2}
        />
        <StatCard
          title="Saldo Livre"
          value={savings}
          change={47}
          variant="neutral"
          icon={<PiggyBank className="w-4 h-4 text-violet-400" />}
          delay={0.3}
        />
      </div>

      {/* Charts row */}
      <div className="grid xl:grid-cols-3 gap-6">
        {/* Main chart */}
        <motion.div
          className="xl:col-span-2 rounded-xl border border-border bg-card p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-semibold">Evolução Financeira</h3>
              <p className="text-sm text-muted-foreground">Entradas vs. Saídas</p>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(["monthly", "weekly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    chartPeriod === p
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  {p === "monthly" ? "Mensal" : "Semanal"}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            {chartPeriod === "monthly" ? (
              <AreaChart data={mockMonthlyData}>
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
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" name="Entradas" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="expenses" name="Saídas" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            ) : (
              <BarChart data={mockWeeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" name="Gastos" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
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
            <p className="text-sm text-muted-foreground">Distribuição de gastos</p>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={mockCategoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {mockCategoryData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip content={<PieCustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2 mt-2">
            {mockCategoryData.slice(0, 5).map((cat) => (
              <div key={cat.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-xs text-muted-foreground flex-1 truncate">{cat.name}</span>
                <span className="text-xs font-medium">{cat.percentage}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid xl:grid-cols-3 gap-6">
        {/* Recent transactions */}
        <motion.div
          className="xl:col-span-1 rounded-xl border border-border bg-card p-5"
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
              <a href="/transactions">Ver todas</a>
            </Button>
          </div>

          <div className="space-y-3">
            {mockTransactions.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center gap-3 group">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: t.category.color + "20" }}
                >
                  {t.category.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(t.date)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-sm font-semibold", t.type === "INCOME" ? "text-emerald-400" : "text-foreground")}>
                    {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                  </p>
                  {t.status === "PENDING" && (
                    <span className="text-[10px] text-yellow-400">Pendente</span>
                  )}
                </div>
              </div>
            ))}
          </div>
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
              <a href="/goals">Ver metas</a>
            </Button>
          </div>

          <div className="space-y-4">
            {mockGoals.map((goal) => {
              const pct = calculatePercentage(goal.currentAmount, goal.targetAmount);
              const completed = pct >= 100;
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{goal.icon}</span>
                      <span className="text-sm font-medium">{goal.title}</span>
                    </div>
                    <span className={cn("text-xs font-medium", completed ? "text-emerald-400" : "text-muted-foreground")}>
                      {formatPercentage(pct, 0)}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-1.5"
                    indicatorClassName={completed ? "bg-emerald-500" : undefined}
                    style={completed ? {} : { "--tw-bg-opacity": 1 } as React.CSSProperties}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(goal.currentAmount)}</span>
                    <span>{formatCurrency(goal.targetAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Budgets & Insights */}
        <motion.div
          className="space-y-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {/* Budgets */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Orçamentos</h3>
              <Badge variant="info" className="text-xs">Jan 2024</Badge>
            </div>
            <div className="space-y-3">
              {mockBudgets.map((b) => {
                const pct = calculatePercentage(b.spent, b.budgeted);
                const over = pct > 85;
                return (
                  <div key={b.category} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{b.category}</span>
                      <span className={cn("text-muted-foreground", over && "text-yellow-400")}>
                        {formatCurrency(b.spent)} / {formatCurrency(b.budgeted)}
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className="h-1.5"
                      indicatorClassName={over ? "bg-yellow-500" : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Insights */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">IA Financeira</h3>
                <p className="text-xs text-muted-foreground">Insights automáticos</p>
              </div>
            </div>
            <div className="space-y-3">
              {mockInsights.slice(0, 2).map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3 text-xs" asChild>
              <a href="/ai">Ver todos os insights</a>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Accounts row */}
      <motion.div
        className="rounded-xl border border-border bg-card p-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Contas e Carteiras</h3>
            <p className="text-sm text-muted-foreground">Patrimônio distribuído</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs">
            <CreditCard className="w-3.5 h-3.5" />
            Adicionar conta
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {mockAccounts.map((account) => (
            <div
              key={account.id}
              className="rounded-xl border border-border/50 bg-muted/30 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
                  style={{ backgroundColor: account.color + "20" }}
                >
                  {account.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {account.type.toLowerCase().replace("_", " ")}
                  </p>
                </div>
              </div>
              <p
                className={cn(
                  "text-lg font-bold",
                  account.balance < 0 ? "text-red-400" : "text-foreground"
                )}
              >
                {formatCurrency(account.balance)}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
