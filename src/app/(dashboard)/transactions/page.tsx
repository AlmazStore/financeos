"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownLeft, ArrowUpRight, Check, Plus, Search,
  Trash2, TrendingDown, TrendingUp, Receipt, Loader2, Upload, Pencil, Copy,
  SlidersHorizontal, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { notifyDataChanged } from "@/lib/events";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const TYPE_FILTERS = ["Todas", "Entradas", "Saídas", "Pendentes"];

type Category = { id: string; name: string; icon: string | null; color: string | null; type: string };

type CatEditor = { ids: string[]; types: string[]; label: string; current: string | null };

type Transaction = {
  id: string;
  title: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "OVERDUE";
  date: string;
  categoryId: string | null;
  category: { name: string; color: string | null; icon: string | null } | null;
};

export default function TransactionsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todas");
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");      // "" = todas, "__none__" = sem categoria, ou id
  const [statusFilter, setStatusFilter] = useState("ALL");        // ALL | COMPLETED | PENDING | CANCELLED
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [catEditor, setCatEditor] = useState<CatEditor | null>(null);
  const [savingCat, setSavingCat] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [dedupOpen, setDedupOpen] = useState(false);
  const [deduping, setDeduping] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pageSize = 500;
      let offset = 0;
      let all: Transaction[] = [];
      // Fetch in chunks until we've loaded everything (no practical cap)
      for (;;) {
        const res = await fetch(`/api/transactions?limit=${pageSize}&offset=${offset}`);
        const d = await res.json();
        const batch: Transaction[] = d.transactions ?? [];
        all = all.concat(batch);
        offset += pageSize;
        if (batch.length < pageSize || offset >= (d.total ?? all.length)) break;
      }
      setTransactions(all);
    } catch {
      toast("Erro ao carregar transações.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? [])).catch(() => {});
  }, []);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const openSingleEditor = (t: Transaction) =>
    setCatEditor({ ids: [t.id], types: [t.type], label: t.title, current: t.categoryId });

  const openBulkEditor = () => {
    const sel = transactions.filter((t) => selected.has(t.id));
    if (!sel.length) return;
    setCatEditor({
      ids: sel.map((t) => t.id),
      types: [...new Set(sel.map((t) => t.type))],
      label: `${sel.length} transações selecionadas`,
      current: null,
    });
  };

  const applyCategory = async (categoryId: string | null) => {
    if (!catEditor) return;
    setSavingCat(true);
    try {
      if (catEditor.ids.length === 1) {
        const res = await fetch(`/api/transactions/${catEditor.ids[0]}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId }),
        });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        setTransactions((prev) => prev.map((t) => (t.id === updated.id ? { ...t, categoryId: updated.categoryId, category: updated.category } : t)));
      } else {
        const res = await fetch("/api/transactions/bulk", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: catEditor.ids, categoryId }),
        });
        if (!res.ok) throw new Error();
        const cat = categories.find((c) => c.id === categoryId);
        const idset = new Set(catEditor.ids);
        setTransactions((prev) => prev.map((t) =>
          idset.has(t.id)
            ? { ...t, categoryId, category: cat ? { name: cat.name, color: cat.color, icon: cat.icon } : null }
            : t
        ));
        setSelected(new Set());
      }
      toast("Categoria atualizada!", "success");
      notifyDataChanged();
      setCatEditor(null);
    } catch {
      toast("Erro ao atualizar categoria.", "error");
    } finally {
      setSavingCat(false);
    }
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error();
      const idset = new Set(ids);
      setTransactions((prev) => prev.filter((t) => !idset.has(t.id)));
      setSelected(new Set());
      toast(`${ids.length} transações excluídas.`, "success");
      notifyDataChanged();
    } catch {
      toast("Erro ao excluir.", "error");
    } finally {
      setBulkDeleting(false);
    }
  };

  const removeDuplicates = async () => {
    setDeduping(true);
    try {
      const res = await fetch("/api/transactions/dedup", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDedupOpen(false);
      if (data.removed > 0) {
        toast(`${data.removed} ${data.removed === 1 ? "duplicada removida" : "duplicadas removidas"}.`, "success");
        load();
        notifyDataChanged();
      } else {
        toast("Nenhuma duplicada encontrada.", "info");
      }
    } catch {
      toast("Erro ao remover duplicadas.", "error");
    } finally {
      setDeduping(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast("Transação excluída.", "success");
      notifyDataChanged();
    } catch {
      toast("Erro ao excluir.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = transactions.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchType =
      typeFilter === "Todas" ||
      (typeFilter === "Entradas" && t.type === "INCOME") ||
      (typeFilter === "Saídas" && t.type === "EXPENSE") ||
      (typeFilter === "Pendentes" && t.status === "PENDING");

    const matchCategory =
      !categoryFilter ||
      (categoryFilter === "__none__" ? t.categoryId == null : t.categoryId === categoryFilter);

    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;

    const d = new Date(t.date);
    const matchFrom = !dateFrom || d >= new Date(dateFrom + "T00:00:00");
    const matchTo = !dateTo || d <= new Date(dateTo + "T23:59:59");

    const min = parseFloat(minValue.replace(",", "."));
    const max = parseFloat(maxValue.replace(",", "."));
    const matchMin = isNaN(min) || t.amount >= min;
    const matchMax = isNaN(max) || t.amount <= max;

    return matchSearch && matchType && matchCategory && matchStatus && matchFrom && matchTo && matchMin && matchMax;
  });

  const activeFilters =
    (categoryFilter ? 1 : 0) + (statusFilter !== "ALL" ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) + (minValue || maxValue ? 1 : 0);

  const clearFilters = () => {
    setCategoryFilter(""); setStatusFilter("ALL");
    setDateFrom(""); setDateTo(""); setMinValue(""); setMaxValue("");
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id));

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME" && t.status === "COMPLETED")
    .reduce((a, b) => a + b.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "EXPENSE" && t.status === "COMPLETED")
    .reduce((a, b) => a + b.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Transações</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${filtered.length} transações`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {transactions.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setDedupOpen(true)}>
              <Copy className="w-4 h-4" />
              Remover duplicadas
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/transactions/import">
              <Upload className="w-4 h-4" />
              Importar extrato
            </Link>
          </Button>
          <Button variant="premium" size="sm" asChild>
            <Link href="/transactions/new">
              <Plus className="w-4 h-4" />
              Nova Transação
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-xs text-muted-foreground">Entradas</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            </div>
            <span className="text-xs text-muted-foreground">Saídas</span>
          </div>
          <p className="text-xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <span className="text-xs text-muted-foreground">Saldo</span>
          </div>
          <p className="text-xl font-bold text-violet-400">{formatCurrency(totalIncome - totalExpenses)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar transações..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                  typeFilter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((s) => !s)}
            className={cn("h-9", (showFilters || activeFilters > 0) && "border-primary text-primary")}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtros
            {activeFilters > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{activeFilters}</span>
            )}
          </Button>
        </div>

        {/* Advanced filters panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="border-t border-border mt-4 pt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {/* Categoria */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full h-9 text-sm bg-muted/50 border border-border rounded-lg px-2 outline-none focus:border-primary"
              >
                <option value="">Todas</option>
                <option value="__none__">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 text-sm bg-muted/50 border border-border rounded-lg px-2 outline-none focus:border-primary"
              >
                <option value="ALL">Todos</option>
                <option value="COMPLETED">Concluído</option>
                <option value="PENDING">Pendente</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>

            {/* Data */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <div className="flex gap-2">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-xs" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>

            {/* Valor */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
              <div className="flex gap-2">
                <Input inputMode="decimal" placeholder="mín" value={minValue} onChange={(e) => setMinValue(e.target.value.replace(/[^0-9,.]/g, ""))} className="h-9 text-xs" />
                <Input inputMode="decimal" placeholder="máx" value={maxValue} onChange={(e) => setMaxValue(e.target.value.replace(/[^0-9,.]/g, ""))} className="h-9 text-xs" />
              </div>
            </div>

            {activeFilters > 0 && (
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                  Limpar filtros
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 sticky top-2 z-30"
        >
          <span className="text-sm font-medium">{selected.size} selecionada{selected.size > 1 ? "s" : ""}</span>
          <div className="flex-1" />
          <Button variant="premium" size="sm" onClick={openBulkEditor}>
            <Pencil className="w-3.5 h-3.5" />
            Definir categoria
          </Button>
          <Button variant="outline" size="sm" onClick={bulkDelete} disabled={bulkDeleting} className="text-red-400 hover:text-red-400">
            {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Excluir
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Cancelar</Button>
        </motion.div>
      )}

      {/* Transaction list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhuma transação ainda"
            description="Importe o extrato do seu banco para registrar tudo de uma vez, ou adicione manualmente. Dica: faça isso a cada 3 dias para manter o controle em dia."
            action={
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="premium" asChild>
                  <Link href="/transactions/import">
                    <Upload className="w-4 h-4" />
                    Importar extrato
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/transactions/new">
                    <Plus className="w-4 h-4" />
                    Adicionar manual
                  </Link>
                </Button>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">Nenhuma transação encontrada com esses filtros.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground items-center">
              <button onClick={() => setSelected(allFilteredSelected ? new Set() : new Set(filtered.map((t) => t.id)))} className="flex-shrink-0">
                <div className={cn(
                  "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                  allFilteredSelected ? "border-emerald-400 bg-emerald-400" : "border-muted-foreground/40"
                )}>
                  {allFilteredSelected && <Check className="w-3 h-3 text-black" />}
                </div>
              </button>
              <span>Transação</span>
              <span>Categoria</span>
              <span>Data</span>
              <span>Status</span>
              <span className="text-right">Valor</span>
            </div>

            <div className="divide-y divide-border">
              {filtered.map((t, i) => (
                <motion.div
                  key={t.id}
                  className={cn(
                    "flex md:grid md:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center transition-colors group",
                    selected.has(t.id) ? "bg-primary/5" : "hover:bg-muted/20"
                  )}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                >
                  <button onClick={() => toggleSelect(t.id)} className="flex-shrink-0 order-first">
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                      selected.has(t.id) ? "border-emerald-400 bg-emerald-400" : "border-muted-foreground/40 hover:border-muted-foreground"
                    )}>
                      {selected.has(t.id) && <Check className="w-3 h-3 text-black" />}
                    </div>
                  </button>

                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ backgroundColor: (t.category?.color ?? "#84cc16") + "20" }}
                    >
                      {t.category?.icon ?? "📦"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.category?.name ?? "Sem categoria"}</p>
                    </div>
                  </div>

                  <div className="hidden md:block">
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {t.category?.name ?? "Outros"}
                    </Badge>
                  </div>

                  <div className="hidden md:block text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(new Date(t.date))}
                  </div>

                  <div className="hidden md:block">
                    {t.status === "COMPLETED" ? (
                      <Badge variant="success" className="gap-1">
                        <Check className="w-2.5 h-2.5" />
                        Concluído
                      </Badge>
                    ) : t.status === "CANCELLED" ? (
                      <Badge variant="outline" className="text-amber-400 border-amber-400/30">Cancelado</Badge>
                    ) : (
                      <Badge variant="warning">Pendente</Badge>
                    )}
                  </div>

                  <div className="ml-auto md:ml-0 flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold whitespace-nowrap",
                        t.type === "INCOME" ? "text-emerald-400" : "text-foreground"
                      )}
                    >
                      {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                    </span>
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                      t.type === "INCOME" ? "bg-emerald-500/10" : "bg-red-500/10"
                    )}>
                      {t.type === "INCOME"
                        ? <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                        : <ArrowDownLeft className="w-3 h-3 text-red-400" />
                      }
                    </div>
                    <button
                      onClick={() => openSingleEditor(t)}
                      title="Editar categoria"
                      className="md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      title="Excluir"
                      className="md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                    >
                      {deletingId === t.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Category editor dialog (single + bulk) */}
      <Dialog open={!!catEditor} onOpenChange={(o) => !o && setCatEditor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{catEditor && catEditor.ids.length > 1 ? "Categoria em massa" : "Editar categoria"}</DialogTitle>
            <DialogDescription>
              {catEditor?.label}
              {catEditor && catEditor.ids.length > 1 ? " — a categoria será aplicada a todas." : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {(() => {
              const multiType = !catEditor || catEditor.types.length > 1;
              const opts = categories.filter((c) =>
                multiType ? true : (c.type === catEditor!.types[0] || c.type === "BOTH")
              );
              if (opts.length === 0) {
                return (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-3">Nenhuma categoria disponível.</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/categories">Criar categoria</Link>
                    </Button>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[320px] overflow-y-auto">
                  {/* Sem categoria */}
                  <button
                    type="button"
                    disabled={savingCat}
                    onClick={() => applyCategory(null)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                      catEditor?.current == null ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:border-border"
                    )}
                  >
                    <span className="text-xl">🚫</span>
                    <span className="text-[10px] text-center leading-tight text-muted-foreground">Sem categoria</span>
                  </button>

                  {opts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={savingCat}
                      onClick={() => applyCategory(c.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                        catEditor?.current === c.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:border-border"
                      )}
                    >
                      <span className="text-xl">{c.icon ?? "📦"}</span>
                      <span className="text-[10px] text-center leading-tight text-muted-foreground truncate w-full">{c.name}</span>
                    </button>
                  ))}
                </div>
              );
            })()}

            {savingCat && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/categories">Gerenciar categorias</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove duplicates confirmation */}
      <Dialog open={dedupOpen} onOpenChange={(o) => !o && setDedupOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover transações duplicadas</DialogTitle>
            <DialogDescription>
              Vamos procurar transações repetidas (mesma data, valor, tipo e descrição) e
              manter apenas a <strong>primeira</strong> de cada — as cópias criadas depois serão excluídas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 my-2">
            <Copy className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Esta ação não pode ser desfeita. Transações legítimas com exatamente os mesmos dados
              também são consideradas duplicadas.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDedupOpen(false)}>Cancelar</Button>
            <Button variant="premium" onClick={removeDuplicates} disabled={deduping}>
              {deduping ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover duplicadas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
