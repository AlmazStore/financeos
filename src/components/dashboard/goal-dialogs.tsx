"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { notifyDataChanged } from "@/lib/events";
import { cn } from "@/lib/utils";

const GOAL_TYPES = [
  { id: "EMERGENCY_FUND", label: "Reserva", icon: "🛡️", color: "#10b981" },
  { id: "SAVINGS", label: "Economia", icon: "💰", color: "#3b82f6" },
  { id: "INVESTMENT", label: "Investir", icon: "📈", color: "#f59e0b" },
  { id: "DEBT_PAYMENT", label: "Quitar dívida", icon: "💳", color: "#ef4444" },
  { id: "PURCHASE", label: "Compra", icon: "🛍️", color: "#8b5cf6" },
  { id: "OTHER", label: "Outro", icon: "🎯", color: "#84cc16" },
];

export function CreateGoalDialog({ onCreated }: { onCreated?: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [type, setType] = useState(GOAL_TYPES[0]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const target = parseFloat(targetAmount.replace(",", "."));
    if (!title.trim() || !target || target <= 0) {
      toast("Preencha o título e o valor da meta.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          targetAmount: target,
          currentAmount: parseFloat(currentAmount.replace(",", ".")) || 0,
          deadline: deadline || undefined,
          type: type.id,
          color: type.color,
          icon: type.icon,
        }),
      });
      if (!res.ok) throw new Error();
      toast("Meta criada!", "success");
      notifyDataChanged();
      setOpen(false);
      setTitle(""); setDescription(""); setTargetAmount(""); setCurrentAmount(""); setDeadline("");
      onCreated?.();
    } catch {
      toast("Erro ao criar meta.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="premium" size="sm">
          <Plus className="w-4 h-4" />
          Nova Meta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Meta Financeira</DialogTitle>
          <DialogDescription>Defina um objetivo e acompanhe o progresso.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all",
                    type.id === t.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:border-border"
                  )}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-[10px] text-center leading-tight text-muted-foreground">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Título</label>
            <Input placeholder="Ex: Reserva de emergência" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <Input placeholder="Ex: 6 meses de gastos" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor da meta</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input inputMode="decimal" placeholder="0,00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value.replace(/[^0-9,.]/g, ""))} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Já guardado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input inputMode="decimal" placeholder="0,00" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value.replace(/[^0-9,.]/g, ""))} className="pl-9" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Prazo <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="premium" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar meta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddValueDialog({ goalId, goalTitle, onDone }: { goalId: string; goalTitle: string; onDone?: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const amount = parseFloat(value.replace(",", "."));
    if (!amount || amount <= 0) { toast("Informe um valor válido.", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addAmount: amount }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json().catch(() => null);
      if (updated?.isCompleted) {
        toast("🏆 Meta concluída! Conquista desbloqueada. Parabéns!", "success");
      } else {
        toast(`R$ ${amount.toFixed(2)} adicionados à meta!`, "success");
      }
      notifyDataChanged();
      setOpen(false);
      setValue("");
      onDone?.();
    } catch {
      toast("Erro ao adicionar valor.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">Adicionar valor</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar valor</DialogTitle>
          <DialogDescription>{goalTitle}</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">R$</span>
            <Input
              inputMode="decimal"
              placeholder="0,00"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^0-9,.]/g, ""))}
              className="pl-10 h-12 text-lg"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="premium" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
