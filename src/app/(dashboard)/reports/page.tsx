"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
  RadialBar, RadialBarChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Download, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";
import { mockMonthlyData, mockCategoryData } from "@/lib/mock-data";

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

const MONTHS_COMPARISON = mockMonthlyData.slice(-3).map((m) => ({
  month: m.month,
  "Entradas": m.income,
  "Saídas": m.expenses,
  "Economia": m.savings,
}));

const DRE_DATA = [
  { label: "Receita Bruta", value: 10700, type: "income" },
  { label: "(-) Impostos", value: -580, type: "deduction" },
  { label: "= Receita Líquida", value: 10120, type: "subtotal" },
  { label: "(-) Custos", value: -2200, type: "deduction" },
  { label: "= Lucro Bruto", value: 7920, type: "subtotal" },
  { label: "(-) Despesas Op.", value: -2569, type: "deduction" },
  { label: "(-) Investimentos", value: -1000, type: "deduction" },
  { label: "= Resultado Líquido", value: 4351, type: "result" },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState("month");

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Relatórios</h2>
          <p className="text-sm text-muted-foreground">Análise completa do seu financeiro</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" />
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
        {["week", "month", "quarter", "year"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
              period === p
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p === "week" ? "Semana" : p === "month" ? "Mês" : p === "quarter" ? "Trimestre" : "Ano"}
          </button>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="comparison">Comparativo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid xl:grid-cols-2 gap-6">
            {/* Evolution chart */}
            <motion.div
              className="rounded-xl border border-border bg-card p-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3 className="font-semibold mb-1">Evolução Financeira</h3>
              <p className="text-sm text-muted-foreground mb-5">7 meses</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={mockMonthlyData}>
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
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="income" name="Entradas" stroke="#10b981" fill="url(#incomeGrad2)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="expenses" name="Saídas" stroke="#ef4444" fill="url(#expenseGrad2)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="savings" name="Economia" stroke="#8b5cf6" fill="url(#savingsGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Savings rate */}
            <motion.div
              className="rounded-xl border border-border bg-card p-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="font-semibold mb-1">Taxa de Poupança</h3>
              <p className="text-sm text-muted-foreground mb-5">Economia vs. Renda</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={mockMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip />
                  <Bar
                    dataKey="savings"
                    name="Economia"
                    fill="#8b5cf6"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid xl:grid-cols-2 gap-6">
            <motion.div
              className="rounded-xl border border-border bg-card p-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3 className="font-semibold mb-5">Gastos por Categoria</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockCategoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                  >
                    {mockCategoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              className="rounded-xl border border-border bg-card p-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="font-semibold mb-5">Detalhamento</h3>
              <div className="space-y-4">
                {mockCategoryData.map((cat) => (
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
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="dre">
          <div className="max-w-xl">
            <motion.div
              className="rounded-xl border border-border bg-card overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="px-6 py-4 border-b border-border bg-muted/30">
                <h3 className="font-semibold">DRE Simplificado</h3>
                <p className="text-sm text-muted-foreground">Janeiro 2024</p>
              </div>
              <div className="divide-y divide-border">
                {DRE_DATA.map((row) => (
                  <div
                    key={row.label}
                    className={cn(
                      "flex items-center justify-between px-6 py-3",
                      row.type === "subtotal" && "bg-muted/20 font-semibold",
                      row.type === "result" && "bg-emerald-500/5 font-bold text-emerald-400"
                    )}
                  >
                    <span className={cn(
                      "text-sm",
                      row.type === "deduction" && "text-muted-foreground pl-4"
                    )}>
                      {row.label}
                    </span>
                    <span className={cn(
                      "text-sm",
                      row.value < 0 ? "text-red-400" : row.type === "result" ? "text-emerald-400" : ""
                    )}>
                      {row.value < 0
                        ? `(${formatCurrency(Math.abs(row.value))})`
                        : formatCurrency(row.value)
                      }
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <motion.div
            className="rounded-xl border border-border bg-card p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h3 className="font-semibold mb-5">Comparativo — Últimos 3 Meses</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={MONTHS_COMPARISON} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
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
    </div>
  );
}
