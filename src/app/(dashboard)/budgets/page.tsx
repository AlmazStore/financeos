"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Wallet, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { notifyDataChanged, useAutoRefresh } from "@/lib/events";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; color: string | null; type: string };
type Budget = {
  id: string; categoryId: string | null; amount: number; spent: number; pct: number; remaining: number;
  category: { name: string; icon: string | null; color: string | null } | null;
};

function BudgetDialog({ categories, used, onDone }: { categories: Category[]; used: Set<string>; onDone: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const available = categories.filter((c) => (c.type === "EXPENSE" || c.type === "BOTH") && !used.has(c.id));

  const submit = async () => {
    const value = parseFloat(amount.replace(",", "."));
    if (!categoryId || !value || value <= 0) { toast("Escolha a categoria e um valor.", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, amount: value }),
      });
      if (!res.ok) throw new Error();
      toast("Orçamento definido!", "success");
      notifyDataChanged();
      setOpen(false); setCategoryId(""); setAmount("");
      onDone();
    } catch { toast("Erro ao salvar orçamento.", "error"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="premium" size="sm"><Plus className="w-4 h-4" />Novo orçamento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Orçamento</DialogTitle>
          <DialogDescription>Defina quanto pretende gastar por mês nesta categoria.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoria</label>
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground">Todas as categorias de despesa já têm orçamento. <Link href="/categories" className="text-primary">Criar categoria</Link></p>
            ) : (
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 text-sm bg-muted/50 border border-border rounded-lg px-2 outline-none focus:border-primary">
                <option value="">Selecione...</option>
                {available.map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Limite mensal</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ""))} className="pl-9" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="premium" onClick={submit} disabled={saving || available.length === 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BudgetsPage() {
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totals, setTotals] = useState({ budget: 0, spent: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/budgets").then((r) => r.json()).then((d) => {
      setBudgets(d.budgets ?? []);
      setTotals(d.totals ?? { budget: 0, spent: 0 });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? [])).catch(() => {}); }, []);
  useAutoRefresh(load);

  const del = async (id: string) => {
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setBudgets((p) => p.filter((b) => b.id !== id));
      toast("Orçamento removido.", "success");
      notifyDataChanged();
    } catch { toast("Erro ao remover.", "error"); }
  };

  const used = new Set(budgets.map((b) => b.categoryId).filter(Boolean) as string[]);
  const totalPct = totals.budget > 0 ? Math.round((totals.spent / totals.budget) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1100px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Orçamentos</h2>
          <p className="text-sm text-muted-foreground">Defina limites de gasto por categoria e acompanhe no mês</p>
        </div>
        {budgets.length > 0 && <BudgetDialog categories={categories} used={used} onDone={load} />}
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : budgets.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Wallet}
            title="Nenhum orçamento definido"
            description="Estabeleça um limite mensal para categorias como Alimentação, Transporte ou Lazer. O app acompanha seus gastos e te avisa ao se aproximar do limite."
            action={<BudgetDialog categories={categories} used={used} onDone={load} />}
          />
        </div>
      ) : (
        <>
          {/* Total summary */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Total orçado no mês</p>
              <p className={cn("text-sm font-semibold", totalPct > 100 ? "text-red-400" : "text-muted-foreground")}>
                {formatCurrency(totals.spent)} / {formatCurrency(totals.budget)}
              </p>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", totalPct > 100 ? "bg-red-500" : totalPct > 85 ? "bg-yellow-500" : "bg-emerald-500")}
                initial={{ width: 0 }} animate={{ width: `${Math.min(100, totalPct)}%` }} transition={{ duration: 0.7 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {totalPct > 100
                ? `Você ultrapassou o orçamento total em ${formatCurrency(totals.spent - totals.budget)}.`
                : `Você usou ${totalPct}% do seu orçamento total. Restam ${formatCurrency(totals.budget - totals.spent)}.`}
            </p>
          </div>

          {/* Per category */}
          <div className="grid sm:grid-cols-2 gap-4">
            {budgets.map((b, i) => {
              const over = b.pct > 100;
              const near = b.pct > 85 && b.pct <= 100;
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.3) }}
                  className={cn("rounded-xl border bg-card p-5 group", over ? "border-red-500/30" : "border-border")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ backgroundColor: (b.category?.color ?? "#84cc16") + "20" }}>
                      {b.category?.icon ?? "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{b.category?.name ?? "Categoria"}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(b.spent)} de {formatCurrency(b.amount)}</p>
                    </div>
                    {over ? <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      : near ? <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      : <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    <button onClick={() => del(b.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", over ? "bg-red-500" : near ? "bg-yellow-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, b.pct)}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className={cn("font-medium", over ? "text-red-400" : near ? "text-yellow-400" : "text-emerald-400")}>{b.pct}%</span>
                    <span className="text-muted-foreground">
                      {over ? `${formatCurrency(Math.abs(b.remaining))} acima` : `${formatCurrency(b.remaining)} restante`}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
