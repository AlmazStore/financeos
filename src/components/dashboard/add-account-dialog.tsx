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

const ACCOUNT_TYPES = [
  { id: "CHECKING", label: "Conta Corrente", icon: "🏦" },
  { id: "SAVINGS", label: "Poupança", icon: "💰" },
  { id: "CREDIT_CARD", label: "Cartão de Crédito", icon: "💳" },
  { id: "INVESTMENT", label: "Investimentos", icon: "📈" },
  { id: "CASH", label: "Dinheiro", icon: "💵" },
  { id: "OTHER", label: "Outro", icon: "📦" },
];

const COLORS = ["#8b5cf6", "#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#ec4899"];

export function AddAccountDialog({ onCreated, trigger }: { onCreated?: () => void; trigger?: React.ReactNode }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("CHECKING");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast("Dê um nome para a conta.", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          balance: parseFloat(balance.replace(",", ".")) || 0,
          color,
          icon: ACCOUNT_TYPES.find((t) => t.id === type)?.icon ?? "🏦",
        }),
      });
      if (!res.ok) throw new Error();
      toast("Conta adicionada!", "success");
      notifyDataChanged();
      setOpen(false);
      setName(""); setBalance(""); setType("CHECKING");
      onCreated?.();
    } catch {
      toast("Erro ao adicionar conta.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="text-xs">
            <Plus className="w-3.5 h-3.5" />
            Adicionar conta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Conta</DialogTitle>
          <DialogDescription>Cadastre um banco, carteira ou cartão.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da conta</label>
            <Input placeholder="Ex: Nubank, Carteira, Itaú..." value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all",
                    type === t.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:border-border"
                  )}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-[10px] text-center leading-tight text-muted-foreground">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Saldo atual</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                inputMode="decimal"
                placeholder="0,00"
                value={balance}
                onChange={(e) => setBalance(e.target.value.replace(/[^0-9,.-]/g, ""))}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">Use valor negativo para faturas de cartão.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cor</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn("w-8 h-8 rounded-lg transition-all", color === c && "ring-2 ring-offset-2 ring-offset-card ring-foreground")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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
