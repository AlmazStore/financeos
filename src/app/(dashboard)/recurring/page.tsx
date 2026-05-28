"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Repeat, Loader2, Plus, Trash2, Pause, Play, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { notifyDataChanged, useAutoRefresh } from "@/lib/events";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { FREQUENCY_LABEL, type Frequency } from "@/lib/recurrence";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; type: string };
type Rule = {
  id: string; title: string; amount: number; type: "INCOME" | "EXPENSE";
  frequency: Frequency; categoryId: string | null; nextDueDate: string; isActive: boolean; generated: number;
};

const FREQS: Frequency[] = ["MONTHLY", "WEEKLY", "BIWEEKLY", "QUARTERLY", "YEARLY", "DAILY"];

function CreateDialog({ categories, onDone }: { categories: Category[]; onDone: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [frequency, setFrequency] = useState<Frequency>("MONTHLY");
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const cats = categories.filter((c) => c.type === type || c.type === "BOTH");

  const submit = async () => {
    const value = parseFloat(amount.replace(",", "."));
    if (!title.trim() || !value || value <= 0) { toast("Preencha descrição e valor.", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/recurring", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, amount: value, type, frequency, categoryId: categoryId || undefined, startDate }),
      });
      if (!res.ok) throw new Error();
      // also materialize immediately if due
      await fetch("/api/recurring/run", { method: "POST" }).catch(() => {});
      toast("Recorrência criada!", "success");
      notifyDataChanged();
      setOpen(false); setTitle(""); setAmount("");
      onDone();
    } catch { toast("Erro ao criar recorrência.", "error"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="premium" size="sm"><Plus className="w-4 h-4" />Nova recorrência</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova recorrência</DialogTitle>
          <DialogDescription>Cadastre uma vez e o app lança automaticamente todo período.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            {(["EXPENSE", "INCOME"] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setType(t); setCategoryId(""); }}
                className={cn("p-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                  type === t ? (t === "INCOME" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-red-500 bg-red-500/10 text-red-400") : "border-border text-muted-foreground")}>
                {t === "INCOME" ? "Entrada" : "Saída"}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Input placeholder="Ex: Aluguel, Salário, Netflix..." value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9,.]/g, ""))} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Frequência</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="w-full h-10 text-sm bg-muted/50 border border-border rounded-lg px-2 outline-none focus:border-primary">
                {FREQS.map((f) => <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 text-sm bg-muted/50 border border-border rounded-lg px-2 outline-none focus:border-primary">
                <option value="">Sem categoria</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">A partir de</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="premium" onClick={submit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RecurringPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/recurring").then((r) => r.json()).then((d) => setRules(d.recurring ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? [])).catch(() => {}); }, []);
  useAutoRefresh(load);

  const toggle = async (r: Rule) => {
    await fetch(`/api/recurring/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !r.isActive }) });
    load();
  };
  const del = async (id: string) => {
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    setRules((p) => p.filter((r) => r.id !== id));
    toast("Recorrência removida (lançamentos mantidos).", "success");
  };

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name;
  const catIcon = (id: string | null) => categories.find((c) => c.id === id)?.icon;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1000px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Recorrentes</h2>
          <p className="text-sm text-muted-foreground">Lançamentos fixos que entram sozinhos (salário, aluguel, assinaturas)</p>
        </div>
        {rules.length > 0 && <CreateDialog categories={categories} onDone={load} />}
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Repeat}
            title="Nenhuma recorrência"
            description="Cadastre seus lançamentos fixos uma vez. O app registra automaticamente todo mês — você nunca mais esquece o aluguel ou o salário."
            action={<CreateDialog categories={categories} onDone={load} />}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.3) }}
              className={cn("rounded-xl border bg-card p-4 flex items-center gap-4 group", r.isActive ? "border-border" : "border-border/50 opacity-60")}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0", r.type === "INCOME" ? "bg-emerald-500/10" : "bg-red-500/10")}>
                {catIcon(r.categoryId) ?? (r.type === "INCOME" ? "⬆️" : "⬇️")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {FREQUENCY_LABEL[r.frequency]} · {catName(r.categoryId) ?? "Sem categoria"} · próx: {formatDate(new Date(r.nextDueDate))}
                </p>
              </div>
              <span className={cn("text-sm font-semibold flex items-center gap-1 flex-shrink-0", r.type === "INCOME" ? "text-emerald-400" : "text-foreground")}>
                {r.type === "INCOME" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                {formatCurrency(r.amount)}
              </span>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => toggle(r)} title={r.isActive ? "Pausar" : "Retomar"} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                  {r.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => del(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
