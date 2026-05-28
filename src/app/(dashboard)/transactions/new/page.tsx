"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, Check, Loader2, Plus, Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: string;
};

export default function NewTransactionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  // Filter categories that match the selected type (or BOTH)
  const visibleCategories = categories.filter(
    (c) => c.type === type || c.type === "BOTH"
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9,.]/g, "").replace(",", ".");
    setAmount(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!title || !value || value <= 0) {
      toast("Preencha a descrição e um valor válido.", "error");
      return;
    }

    setLoading(true);

    // Future-dated transactions are PENDING (show up in cash flow)
    const isFuture = new Date(date) > new Date(new Date().toDateString());

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          amount: value,
          type,
          date,
          categoryId: categoryId ?? undefined,
          notes: notes || undefined,
          isRecurring: recurring,
          status: isFuture ? "PENDING" : "COMPLETED",
        }),
      });

      if (!res.ok) throw new Error();

      toast(
        type === "INCOME" ? "Entrada registrada com sucesso!" : "Saída registrada com sucesso!",
        "success"
      );
      router.push("/transactions");
      router.refresh();
    } catch {
      toast("Erro ao salvar a transação. Tente novamente.", "error");
      setLoading(false);
    }
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
                onClick={() => { setType(t); setCategoryId(null); }}
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
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={handleAmountChange}
                className={cn(
                  "flex-1 text-5xl font-bold bg-transparent outline-none border-0 placeholder:text-muted-foreground/30 w-full",
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Categoria</label>
              <Link href="/categories" className="text-xs text-primary hover:underline">Editar categorias</Link>
            </div>
            {visibleCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground">Carregando categorias...</p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {visibleCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all",
                      categoryId === cat.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:border-border bg-muted/30"
                    )}
                  >
                    <span className="text-xl">{cat.icon ?? "📦"}</span>
                    <span className="text-[10px] text-center leading-tight text-muted-foreground">{cat.name}</span>
                  </button>
                ))}
              </div>
            )}
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
            <p className="text-xs text-muted-foreground">
              Datas futuras entram como &quot;pendente&quot; e aparecem no Fluxo de Caixa.
            </p>
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
              <p className="text-xs text-muted-foreground">Marque despesas/receitas que se repetem todo mês</p>
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
