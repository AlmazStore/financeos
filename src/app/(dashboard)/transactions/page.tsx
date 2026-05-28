"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft, ArrowUpRight, Check, ChevronDown, Filter,
  Plus, Search, SlidersHorizontal, TrendingDown, TrendingUp,
  Upload, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { mockTransactions } from "@/lib/mock-data";

const TYPE_FILTERS = ["Todas", "Entradas", "Saídas", "Pendentes"];
const CATEGORY_FILTERS = ["Todas", "Alimentação", "Moradia", "Transporte", "Saúde", "Investimentos", "Assinaturas", "Lazer"];

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todas");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = mockTransactions.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchType =
      typeFilter === "Todas" ||
      (typeFilter === "Entradas" && t.type === "INCOME") ||
      (typeFilter === "Saídas" && t.type === "EXPENSE") ||
      (typeFilter === "Pendentes" && t.status === "PENDING");
    return matchSearch && matchType;
  });

  const totalIncome = mockTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((a, b) => a + b.amount, 0);
  const totalExpenses = mockTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((a, b) => a + b.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Transações</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} transações encontradas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4" />
            Importar CSV
          </Button>
          <Button variant="premium" size="sm">
            <Plus className="w-4 h-4" />
            Nova Transação
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
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
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
          <div className="flex gap-2">
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
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "border-primary text-primary")}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filtros
            </Button>
          </div>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="border-t border-border pt-4"
          >
            <div className="flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat}
                  className="px-3 py-1 rounded-full text-xs border border-border hover:border-primary hover:text-primary transition-all"
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Transaction list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table header */}
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
              className="flex md:grid md:grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors cursor-pointer group"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              {/* Title + icon */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: t.category.color + "20" }}
                >
                  {t.category.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.category.name}</p>
                </div>
              </div>

              {/* Category */}
              <div className="hidden md:block">
                <Badge variant="outline" className="text-xs whitespace-nowrap">
                  {t.category.name}
                </Badge>
              </div>

              {/* Date */}
              <div className="hidden md:block text-xs text-muted-foreground whitespace-nowrap">
                {formatDate(t.date)}
              </div>

              {/* Status */}
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

              {/* Amount */}
              <div className="ml-auto md:ml-0 flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-semibold",
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
              </div>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">Nenhuma transação encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
