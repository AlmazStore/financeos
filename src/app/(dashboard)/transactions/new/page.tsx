"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, Check, Loader2, Paperclip, Plus,
  Repeat, Tag, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

const CATEGORIES = [
  { id: "food", name: "Alimentação", icon: "🛒", color: "#f59e0b" },
  { id: "housing", name: "Moradia", icon: "🏠", color: "#ef4444" },
  { id: "transport", name: "Transporte", icon: "🚗", color: "#3b82f6" },
  { id: "health", name: "Saúde", icon: "💊", color: "#14b8a6" },
  { id: "entertainment", name: "Lazer", icon: "🎮", color: "#ec4899" },
  { id: "subscriptions", name: "Assinaturas", icon: "📺", color: "#8b5cf6" },
  { id: "investment", name: "Investimentos", icon: "📈", color: "#6366f1" },
  { id: "salary", name: "Salário", icon: "💼", color: "#10b981" },
  { id: "freelance", name: "Freelance", icon: "💻", color: "#10b981" },
  { id: "other", name: "Outros", icon: "📦", color: "#84cc16" },
];

export default function NewTransactionPage() {
  const router = useRouter();
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9,.]/g, "").replace(",", ".");
    setAmount(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    router.push("/transactions");
  };

  return (
    <div className="p-4 sm:p-6 max-w-[700px]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Nova Transação</h2>
            <p className="text-sm text-muted-foreground">Registre uma nova movimentação financeira</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-3">
            {(["EXPENSE", "INCOME"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "flex items-center justify-center gap-2 p-4 rounded-xl border-2 font-medium transition-all",
                  type === t
                    ? t === "INCOME"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-red-500 bg-red-500/10 text-red-400"
                    : "border-border text-muted-foreground hover:border-border/80"
                )}
              >
                <span className="text-xl">{t === "INCOME" ? "⬆️" : "⬇️"}</span>
                {t === "INCOME" ? "Entrada" : "Saída"}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground mb-2">Valor da transação</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl text-muted-foreground font-light">R$</span>
              <input
                type="text"
                placeholder="0,00"
                value={amount}
                onChange={handleAmountChange}
                className={cn(
                  "flex-1 text-5xl font-bold bg-transparent outline-none border-0 placeholder:text-muted-foreground/30",
                  type === "INCOME" ? "text-emerald-400" : "text-foreground"
                )}
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Input
              placeholder="Ex: Supermercado, Salário, Netflix..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Categoria</label>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all",
                    category === cat.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:border-border bg-muted/30"
                  )}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[10px] text-center leading-tight text-muted-foreground">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Observações <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione detalhes sobre esta transação..."
              className="w-full h-20 rounded-lg border border-border bg-transparent px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          {/* Recurring toggle */}
          <button
            type="button"
            onClick={() => setRecurring(!recurring)}
            className={cn(
              "flex items-center gap-3 w-full p-4 rounded-xl border-2 text-left transition-all",
              recurring ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              recurring ? "bg-primary/15" : "bg-muted"
            )}>
              <Repeat className={cn("w-4 h-4", recurring ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="text-sm font-medium">Transação recorrente</p>
              <p className="text-xs text-muted-foreground">Repetir mensalmente de forma automática</p>
            </div>
            <div className={cn(
              "ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center",
              recurring ? "border-primary bg-primary" : "border-border"
            )}>
              {recurring && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
          </button>

          {/* Actions */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="premium"
              className="flex-1 h-11"
              disabled={loading || !title || !amount}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Adicionar Transação
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
