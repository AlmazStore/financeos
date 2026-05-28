"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft, ArrowUpRight, Calendar, ChevronLeft,
  ChevronRight, Clock, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { mockCashFlow } from "@/lib/mock-data";

const UPCOMING = [
  { name: "Aluguel", amount: 1800, date: new Date("2024-02-07"), type: "payable", recurrent: true, category: "🏠" },
  { name: "Netflix", amount: 39.90, date: new Date("2024-02-12"), type: "payable", recurrent: true, category: "📺" },
  { name: "Salário", amount: 8500, date: new Date("2024-02-05"), type: "receivable", recurrent: true, category: "💼" },
  { name: "Academia", amount: 99.90, date: new Date("2024-02-18"), type: "payable", recurrent: true, category: "💪" },
  { name: "Freelance Dev", amount: 3200, date: new Date("2024-02-20"), type: "receivable", recurrent: false, category: "💻" },
  { name: "Conta de Luz", amount: 187, date: new Date("2024-02-26"), type: "payable", recurrent: false, category: "⚡" },
];

export default function CashflowPage() {
  const [view, setView] = useState<"list" | "calendar">("list");

  const totalReceivable = UPCOMING.filter((u) => u.type === "receivable").reduce((a, b) => a + b.amount, 0);
  const totalPayable = UPCOMING.filter((u) => u.type === "payable").reduce((a, b) => a + b.amount, 0);
  const balance = totalReceivable - totalPayable;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Fluxo de Caixa</h2>
          <p className="text-sm text-muted-foreground">Contas a pagar e a receber</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            {(["list", "calendar"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                  view === v ? "bg-background shadow-sm" : "text-muted-foreground"
                )}
              >
                {v === "list" ? <ArrowUpRight className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                {v === "list" ? "Lista" : "Calendário"}
              </button>
            ))}
          </div>
          <Button variant="premium" size="sm">
            <Plus className="w-4 h-4" />
            Nova conta
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">A receber este mês</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalReceivable)}</p>
          <p className="text-xs text-muted-foreground mt-1">{UPCOMING.filter((u) => u.type === "receivable").length} entradas previstas</p>
        </div>

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-red-400" />
            <span className="text-xs text-muted-foreground">A pagar este mês</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalPayable)}</p>
          <p className="text-xs text-muted-foreground mt-1">{UPCOMING.filter((u) => u.type === "payable").length} saídas previstas</p>
        </div>

        <div className={cn(
          "rounded-xl border p-5",
          balance >= 0 ? "border-violet-500/20 bg-violet-500/5" : "border-red-500/20 bg-red-500/5"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-muted-foreground">Saldo previsto</span>
          </div>
          <p className={cn("text-2xl font-bold", balance >= 0 ? "text-violet-400" : "text-red-400")}>
            {formatCurrency(balance)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Ao final do mês</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-5">Projeção de Caixa</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={mockCashFlow} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
            <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Bar dataKey="receivable" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="payable" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
          <h3 className="font-semibold">Próximas Movimentações</h3>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg hover:bg-accent">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">Fevereiro 2024</span>
            <button className="p-1.5 rounded-lg hover:bg-accent">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {UPCOMING.sort((a, b) => a.date.getTime() - b.date.getTime()).map((item, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="text-center w-10 flex-shrink-0">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-base",
                  item.type === "receivable" ? "bg-emerald-500/10" : "bg-red-500/10"
                )}>
                  {item.category}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.recurrent && (
                    <Badge variant="outline" className="text-[10px] px-1.5">Recorrente</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className={cn(
                  "text-sm font-semibold",
                  item.type === "receivable" ? "text-emerald-400" : "text-red-400"
                )}>
                  {item.type === "receivable" ? "+" : "-"}{formatCurrency(item.amount)}
                </div>
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center",
                  item.type === "receivable" ? "bg-emerald-500/10" : "bg-red-500/10"
                )}>
                  {item.type === "receivable"
                    ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                  }
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
