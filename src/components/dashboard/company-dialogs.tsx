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
import { cn } from "@/lib/utils";

const COLORS = ["#8b5cf6", "#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#ec4899"];

export function CreateCompanyDialog({ onCreated }: { onCreated?: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast("Informe o nome da empresa.", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cnpj: cnpj || undefined, description: description || undefined, color }),
      });
      if (!res.ok) throw new Error();
      toast("Empresa criada!", "success");
      setOpen(false);
      setName(""); setCnpj(""); setDescription("");
      onCreated?.();
    } catch {
      toast("Erro ao criar empresa.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="premium" size="sm">
          <Plus className="w-4 h-4" />
          Nova Empresa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Empresa</DialogTitle>
          <DialogDescription>Gerencie as finanças de um negócio separadamente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome da empresa</label>
            <Input placeholder="Ex: Studio Digital Ltda" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">CNPJ <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <Input placeholder="00.000.000/0001-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <Input placeholder="Ex: Agência de marketing digital" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Cor</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn("w-8 h-8 rounded-lg transition-all", color === c && "ring-2 ring-offset-2 ring-offset-card ring-foreground")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="premium" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar empresa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddClientDialog({ companyId, onDone }: { companyId: string; onDone?: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast("Informe o nome do cliente.", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email || undefined, phone: phone || undefined }),
      });
      if (!res.ok) throw new Error();
      toast("Cliente adicionado!", "success");
      setOpen(false);
      setName(""); setEmail(""); setPhone("");
      onDone?.();
    } catch {
      toast("Erro ao adicionar cliente.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full"><Plus className="w-4 h-4" />Novo cliente</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>Cadastre um cliente desta empresa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input placeholder="Nome do cliente ou empresa" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <Input type="email" placeholder="cliente@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefone <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <Input placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
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

export function AddMemberDialog({ companyId, onDone }: { companyId: string; onDone?: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "FINANCIAL" | "VIEWER">("VIEWER");
  const [loading, setLoading] = useState(false);

  const ROLES = [
    { id: "ADMIN" as const, label: "Administrador", desc: "Gerencia tudo" },
    { id: "FINANCIAL" as const, label: "Financeiro", desc: "Lança transações" },
    { id: "VIEWER" as const, label: "Visualização", desc: "Apenas vê" },
  ];

  const submit = async () => {
    if (!email.trim()) { toast("Informe o email.", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const json = await res.json();
      if (!res.ok) { toast(json.error ?? "Erro ao convidar.", "error"); return; }
      toast("Membro adicionado!", "success");
      setOpen(false);
      setEmail("");
      onDone?.();
    } catch {
      toast("Erro ao convidar membro.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full"><Plus className="w-4 h-4" />Convidar membro</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Membro</DialogTitle>
          <DialogDescription>A pessoa precisa já ter uma conta no FinanceOS.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email da pessoa</label>
            <Input type="email" placeholder="pessoa@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Permissão</label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <button key={r.id} type="button" onClick={() => setRole(r.id)}
                  className={cn(
                    "flex items-center justify-between w-full p-3 rounded-xl border-2 text-left transition-all",
                    role === r.id ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                  )}>
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                  <div className={cn("w-4 h-4 rounded-full border-2", role === r.id ? "border-primary bg-primary" : "border-border")} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="premium" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convidar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CompanyTxDialog({ companyId, onDone }: { companyId: string; onDone?: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const value = parseFloat(amount.replace(",", "."));
    if (!title.trim() || !value || value <= 0) { toast("Preencha descrição e valor.", "error"); return; }
    setLoading(true);
    const isFuture = new Date(date) > new Date(new Date().toDateString());
    try {
      const res = await fetch(`/api/companies/${companyId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, amount: value, type, date, status: isFuture ? "PENDING" : "COMPLETED" }),
      });
      if (!res.ok) throw new Error();
      toast("Lançamento registrado!", "success");
      setOpen(false);
      setTitle(""); setAmount("");
      onDone?.();
    } catch {
      toast("Erro ao lançar.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="premium" size="sm"><Plus className="w-4 h-4" />Lançamento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançamento da Empresa</DialogTitle>
          <DialogDescription>Registre uma receita ou despesa. Datas futuras viram contas a pagar/receber.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            {(["INCOME", "EXPENSE"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={cn(
                  "p-3 rounded-xl border-2 font-medium transition-all text-sm",
                  type === t
                    ? t === "INCOME" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-red-500 bg-red-500/10 text-red-400"
                    : "border-border text-muted-foreground"
                )}>
                {t === "INCOME" ? "Receita" : "Despesa"}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Input placeholder="Ex: Cliente X, Aluguel, Folha..." value={title} onChange={(e) => setTitle(e.target.value)} />
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
              <label className="text-sm font-medium">Data</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="premium" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lançar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
