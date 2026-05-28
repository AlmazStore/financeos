"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Zap, Loader2, ArrowUpRight, ArrowDownLeft, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { notifyDataChanged } from "@/lib/events";
import { parseQuickAdd } from "@/lib/quick-add";
import { cn, formatCurrency } from "@/lib/utils";

type Category = { id: string; name: string; icon: string | null; type: string };

export function QuickAddFab() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && categories.length === 0) {
      fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? [])).catch(() => {});
    }
  }, [open, categories.length]);

  const preview = text.trim() ? parseQuickAdd(text, categories) : null;
  const cat = preview?.categoryId ? categories.find((c) => c.id === preview.categoryId) : null;

  const submit = async () => {
    if (!preview || !preview.amount || preview.amount <= 0) {
      toast("Inclua um valor. Ex: \"mercado 85,50\"", "error");
      return;
    }
    setSaving(true);
    try {
      const isFuture = new Date(preview.date) > new Date(new Date().toDateString());
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: preview.title,
          amount: preview.amount,
          type: preview.type,
          date: preview.date,
          categoryId: preview.categoryId ?? undefined,
          status: isFuture ? "PENDING" : "COMPLETED",
        }),
      });
      if (!res.ok) throw new Error();
      toast(`${preview.type === "INCOME" ? "Entrada" : "Saída"} de ${formatCurrency(preview.amount)} registrada!`, "success");
      notifyDataChanged();
      setText("");
      setOpen(false);
    } catch {
      toast("Erro ao registrar. Tente novamente.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform"
        aria-label="Lançamento rápido"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 240 }}
              className="w-full max-w-md bg-card border border-border rounded-2xl p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold">Lançamento rápido</span>
                </div>
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
              </div>

              <Input
                autoFocus
                placeholder='Ex: "mercado 85,50 ontem" ou "salário 5000 entrada"'
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="h-11"
              />

              {/* Live preview */}
              {preview && preview.amount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-muted/40"
                >
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0", preview.type === "INCOME" ? "bg-emerald-500/15" : "bg-red-500/10")}>
                    {cat?.icon ?? (preview.type === "INCOME" ? "⬆️" : "⬇️")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{preview.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat?.name ?? "Sem categoria"} · {new Date(preview.date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className={cn("text-sm font-semibold flex items-center gap-1", preview.type === "INCOME" ? "text-emerald-400" : "text-foreground")}>
                    {preview.type === "INCOME" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                    {formatCurrency(preview.amount)}
                  </span>
                </motion.div>
              )}

              <div className="flex gap-2 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button variant="premium" className="flex-1" onClick={submit} disabled={saving || !preview?.amount}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 text-center">
                Digite descrição + valor. Use &quot;ontem&quot;, data (05/06) ou &quot;entrada&quot; para ajustar.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
