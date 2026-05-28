"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownLeft, ArrowUpRight, Clock, Plus, Loader2, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useAutoRefresh } from "@/lib/events";

type Upcoming = {
  id: string; name: string; amount: number; date: string;
  type: "payable" | "receivable"; recurrent: boolean; category: string;
};

type CashflowData = {
  upcoming: Upcoming[];
  chart: { date: string; payable: number; receivable: number }[];
  totals: { receivable: number; payable: number; balance: number };
};

export default function CashflowPage() {
  const [data, setData] = useState<CashflowData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/cashflow")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  const totals = data?.totals ?? { receivable: 0, payable: 0, balance: 0 };
  const upcoming = data?.upcoming ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Fluxo de Caixa</h2>
          <p className="text-sm text-muted-foreground">Contas a pagar e a receber</p>
        </div>
        <Button variant="premium" size="sm" asChild>
          <Link href="/transactions/new">
            <Plus className="w-4 h-4" />
            Nova conta
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : upcoming.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={CalendarClock}
            title="Nenhuma conta agendada"
            description="Adicione transações com data futura (uma conta que vai vencer, um pagamento que vai receber) e elas aparecerão aqui como contas a pagar e a receber."
            action={
              <Button variant="premium" asChild>
                <Link href="/transactions/new"><Plus className="w-4 h-4" />Agendar conta</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground">A receber</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totals.receivable)}</p>
              <p className="text-xs text-muted-foreground mt-1">{upcoming.filter((u) => u.type === "receivable").length} entradas previstas</p>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-4 h-4 text-red-400" />
                <span className="text-xs text-muted-foreground">A pagar</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(totals.payable)}</p>
              <p className="text-xs text-muted-foreground mt-1">{upcoming.filter((u) => u.type === "payable").length} saídas previstas</p>
            </div>

            <div className={cn("rounded-xl border p-5", totals.balance >= 0 ? "border-violet-500/20 bg-violet-500/5" : "border-red-500/20 bg-red-500/5")}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-violet-400" />
                <span className="text-xs text-muted-foreground">Saldo previsto</span>
              </div>
              <p className={cn("text-2xl font-bold", totals.balance >= 0 ? "text-violet-400" : "text-red-400")}>
                {formatCurrency(totals.balance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Após todas as contas</p>
            </div>
          </div>

          {/* Chart */}
          {(data?.chart?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold mb-5">Projeção de Caixa</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data?.chart ?? []} barSize={24}>
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
          )}

          {/* List */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
              <h3 className="font-semibold">Próximas Movimentações</h3>
            </div>

            <div className="divide-y divide-border">
              {upcoming.map((item, i) => (
                <motion.div
                  key={item.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                >
                  <div className="text-center w-10 flex-shrink-0">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-base", item.type === "receivable" ? "bg-emerald-500/10" : "bg-red-500/10")}>
                      {item.category}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.recurrent && <Badge variant="outline" className="text-[10px] px-1.5">Recorrente</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(new Date(item.date))}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={cn("text-sm font-semibold", item.type === "receivable" ? "text-emerald-400" : "text-red-400")}>
                      {item.type === "receivable" ? "+" : "-"}{formatCurrency(item.amount)}
                    </div>
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", item.type === "receivable" ? "bg-emerald-500/10" : "bg-red-500/10")}>
                      {item.type === "receivable" ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
