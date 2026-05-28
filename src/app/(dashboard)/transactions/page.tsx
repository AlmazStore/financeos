"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownLeft, ArrowUpRight, Check, Plus, Search,
  Trash2, TrendingDown, TrendingUp, Receipt, Loader2, Upload, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const TYPE_FILTERS = ["Todas", "Entradas", "Saídas", "Pendentes"];

type Category = { id: string; name: string; icon: string | null; color: string | null; type: string };

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [savingCat, setSavingCat] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/transactions?limit=200")
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions ?? []))
      .catch(() => toast("Erro ao carregar transações.", "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? [])).catch(() => {});
  }, []);

  const changeCategory = async (categoryId: string | null) => {
    if (!editTx) return;
    setSavingCat(true);
    try {
      const res = await fetch(`/api/transactions/${editTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? { ...t, categoryId: updated.categoryId, category: updated.category } : t)));
      toast("Categoria atualizada!", "success");
      setEditTx(null);
    } catch {
      toast("Erro ao atualizar categoria.", "error");
    } finally {
      setSavingCat(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast("Transação excluída.", "success");
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
    return matchSearch && matchType;
  });

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
        <div className="flex gap-2">
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
        </div>
      </div>

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
            <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
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
                  className="flex md:grid md:grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors group"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                >
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
                      onClick={() => setEditTx(t)}
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

      {/* Edit category dialog */}
      <Dialog open={!!editTx} onOpenChange={(o) => !o && setEditTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
            <DialogDescription>
              {editTx?.title} · {editTx ? formatCurrency(editTx.amount) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {(() => {
              const opts = categories.filter((c) => !editTx || c.type === editTx.type || c.type === "BOTH");
              if (opts.length === 0) {
                return (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-3">Nenhuma categoria disponível para este tipo.</p>
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
                    onClick={() => changeCategory(null)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                      editTx?.categoryId == null ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:border-border"
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
                      onClick={() => changeCategory(c.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                        editTx?.categoryId === c.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:border-border"
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
    </div>
  );
}
