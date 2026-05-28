"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2, Pencil, Trash2, Tag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { notifyDataChanged } from "@/lib/events";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Category = {
  id: string; name: string; icon: string | null; color: string | null; type: string;
};

const ICONS = ["🛒","🏠","🚗","💊","🎮","📺","📈","💼","💻","📦","🍽️","✈️","🎓","💪","⚡","🐶","🎁","☕","👕","💳","📱","🏥","💰","📚"];
const COLORS = ["#10b981","#3b82f6","#ef4444","#f59e0b","#8b5cf6","#ec4899","#14b8a6","#6366f1","#84cc16","#f97316"];
const TYPES = [
  { id: "EXPENSE", label: "Saída" },
  { id: "INCOME", label: "Entrada" },
  { id: "BOTH", label: "Ambos" },
];

const TYPE_LABEL: Record<string, string> = { EXPENSE: "Saída", INCOME: "Entrada", BOTH: "Ambos" };

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  // form state
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [type, setType] = useState("EXPENSE");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName(""); setIcon(ICONS[0]); setColor(COLORS[0]); setType("EXPENSE");
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name); setIcon(c.icon ?? ICONS[0]); setColor(c.color ?? COLORS[0]); setType(c.type);
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) { toast("Dê um nome para a categoria.", "error"); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon, color, type }),
      });
      if (!res.ok) throw new Error();
      toast(editing ? "Categoria atualizada!" : "Categoria criada!", "success");
      notifyDataChanged();
      setOpen(false);
      load();
    } catch {
      toast("Erro ao salvar categoria.", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast("Categoria excluída. As transações ficaram sem categoria.", "success");
      notifyDataChanged();
    } catch {
      toast("Erro ao excluir.", "error");
    }
  };

  const income = categories.filter((c) => c.type === "INCOME" || c.type === "BOTH");
  const expense = categories.filter((c) => c.type === "EXPENSE" || c.type === "BOTH");

  const Section = ({ title, items }: { title: string; items: Category[] }) => (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">{title} ({items.length})</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((c) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: (c.color ?? "#84cc16") + "20" }}>
              {c.icon ?? "📦"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{c.name}</p>
              <Badge variant="outline" className="text-[10px] mt-0.5">{TYPE_LABEL[c.type]}</Badge>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1100px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Categorias</h2>
          <p className="text-sm text-muted-foreground">Organize suas entradas e saídas</p>
        </div>
        <Button variant="premium" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nova categoria
        </Button>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Tag}
            title="Nenhuma categoria"
            description="Crie categorias para organizar seus gastos e receitas — elas aparecem ao adicionar transações e nos relatórios."
            action={<Button variant="premium" onClick={openCreate}><Plus className="w-4 h-4" />Criar categoria</Button>}
          />
        </div>
      ) : (
        <div className="space-y-8">
          <Section title="Saídas" items={expense} />
          <Section title="Entradas" items={income} />
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            <DialogDescription>Personalize nome, ícone, cor e tipo.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: color + "20" }}>
                {icon}
              </div>
              <p className="font-medium">{name || "Nome da categoria"}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input placeholder="Ex: Alimentação" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button key={t.id} type="button" onClick={() => setType(t.id)}
                    className={cn("p-2.5 rounded-xl border-2 text-sm font-medium transition-all", type === t.id ? "border-primary bg-primary/5" : "border-border text-muted-foreground")}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ícone</label>
              <div className="grid grid-cols-8 gap-1.5">
                {ICONS.map((ic) => (
                  <button key={ic} type="button" onClick={() => setIcon(ic)}
                    className={cn("aspect-square rounded-lg flex items-center justify-center text-lg transition-all", icon === ic ? "bg-primary/15 ring-2 ring-primary" : "bg-muted/40 hover:bg-muted")}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all", color === c && "ring-2 ring-offset-2 ring-offset-card ring-foreground")}
                    style={{ backgroundColor: c }}>
                    {color === c && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="premium" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
