"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2, DollarSign, Plus, TrendingDown, TrendingUp,
  BarChart2, Loader2, Trash2, Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import {
  CreateCompanyDialog, AddClientDialog, AddMemberDialog, CompanyTxDialog,
} from "@/components/dashboard/company-dialogs";
import { cn, formatCurrency, formatPercentage, formatDate, calculatePercentage, getInitials } from "@/lib/utils";

type CompanyListItem = {
  id: string; name: string; cnpj: string | null; color: string | null;
  revenue: number; expenses: number; profit: number; role: string;
};

type CompanyDetail = {
  company: {
    id: string; name: string; cnpj: string | null; color: string | null; description: string | null;
    role: string; revenue: number; expenses: number; profit: number;
    monthRevenue: number; monthExpenses: number; monthProfit: number;
  };
  transactions: { id: string; title: string; amount: number; type: string; status: string; date: string }[];
  upcoming: { id: string; title: string; amount: number; type: string; date: string }[];
  clients: { id: string; name: string; email: string | null; phone: string | null }[];
  members: { id: string; role: string; name: string | null; email: string | null; image: string | null }[];
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Dono", ADMIN: "Administrador", FINANCIAL: "Financeiro", VIEWER: "Visualização",
};

export default function CompaniesPage() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadCompanies = useCallback(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => {
        setCompanies(d.companies ?? []);
        if (d.companies?.length && !selectedId) setSelectedId(d.companies[0].id);
        if (!d.companies?.length) setSelectedId(null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedId]);

  const loadDetail = useCallback((id: string) => {
    setLoadingDetail(true);
    fetch(`/api/companies/${id}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);
  useEffect(() => { if (selectedId) loadDetail(selectedId); else setDetail(null); }, [selectedId, loadDetail]);

  const refreshAll = () => { loadCompanies(); if (selectedId) loadDetail(selectedId); };

  const deleteCompany = async (id: string) => {
    try {
      const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast(json.error ?? "Erro.", "error"); return; }
      toast("Empresa excluída.", "success");
      setSelectedId(null);
      loadCompanies();
    } catch { toast("Erro ao excluir.", "error"); }
  };

  const deleteClient = async (clientId: string) => {
    if (!selectedId) return;
    await fetch(`/api/companies/${selectedId}/clients?clientId=${clientId}`, { method: "DELETE" });
    loadDetail(selectedId);
    toast("Cliente removido.", "success");
  };

  const removeMember = async (memberId: string) => {
    if (!selectedId) return;
    const res = await fetch(`/api/companies/${selectedId}/members?memberId=${memberId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) { toast(json.error ?? "Erro.", "error"); return; }
    loadDetail(selectedId);
    toast("Membro removido.", "success");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>;
  }

  if (companies.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-[1400px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Empresas</h2>
            <p className="text-sm text-muted-foreground">Gerencie múltiplos negócios</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Building2}
            title="Nenhuma empresa cadastrada"
            description="Crie uma empresa para separar as finanças do seu negócio das pessoais. Você pode controlar receitas, despesas, clientes e equipe de cada CNPJ."
            action={<CreateCompanyDialog onCreated={loadCompanies} />}
          />
        </div>
      </div>
    );
  }

  const c = detail?.company;
  const profitMargin = c && c.revenue > 0 ? calculatePercentage(c.profit, c.revenue) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Empresas</h2>
          <p className="text-sm text-muted-foreground">{companies.length} {companies.length === 1 ? "empresa" : "empresas"}</p>
        </div>
        <CreateCompanyDialog onCreated={loadCompanies} />
      </div>

      {/* Company selector */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {companies.map((company) => (
          <button
            key={company.id}
            onClick={() => setSelectedId(company.id)}
            className={cn(
              "rounded-xl border p-5 text-left transition-all hover:shadow-md",
              selectedId === company.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: (company.color ?? "#8b5cf6") + "20" }}>
                <Building2 className="w-5 h-5" style={{ color: company.color ?? "#8b5cf6" }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{company.name}</p>
                <p className="text-xs text-muted-foreground truncate">{company.cnpj ?? "Sem CNPJ"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Receita</p>
                <p className="text-sm font-semibold text-emerald-400">{formatCurrency(company.revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lucro</p>
                <p className="text-sm font-semibold">{formatCurrency(company.profit)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Company details */}
      {loadingDetail || !c ? (
        <div className="rounded-xl border border-border bg-card py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border" style={{ background: `linear-gradient(135deg, ${(c.color ?? "#8b5cf6")}15, transparent)` }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: (c.color ?? "#8b5cf6") + "20" }}>
                  <Building2 className="w-6 h-6" style={{ color: c.color ?? "#8b5cf6" }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">{c.name}</h3>
                    <Badge variant="outline" className="text-xs">{ROLE_LABELS[c.role]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.cnpj ? `CNPJ: ${c.cnpj}` : c.description ?? "—"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <CompanyTxDialog companyId={c.id} onDone={refreshAll} />
                {c.role === "OWNER" && (
                  <Button variant="outline" size="sm" onClick={() => deleteCompany(c.id)} className="text-red-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Receita Total", value: c.revenue, color: "text-emerald-400", icon: TrendingUp },
                { label: "Despesas", value: c.expenses, color: "text-red-400", icon: TrendingDown },
                { label: "Lucro Líquido", value: c.profit, color: "text-violet-400", icon: DollarSign },
                { label: "Margem", value: null, label2: formatPercentage(profitMargin), color: "text-blue-400", icon: BarChart2 },
              ].map((kpi, i) => (
                <div key={i} className="rounded-xl bg-muted/30 border border-border/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className={cn("text-xl font-bold", kpi.color)}>
                    {kpi.value !== null ? formatCurrency(kpi.value) : kpi.label2}
                  </p>
                </div>
              ))}
            </div>

            <Tabs defaultValue="cashflow">
              <TabsList>
                <TabsTrigger value="cashflow">Movimentações</TabsTrigger>
                <TabsTrigger value="team">Equipe</TabsTrigger>
                <TabsTrigger value="clients">Clientes</TabsTrigger>
              </TabsList>

              {/* Cashflow / transactions */}
              <TabsContent value="cashflow" className="mt-5">
                <div className="grid xl:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4 text-sm">Próximos Vencimentos (pendentes)</h4>
                    {detail.upcoming.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">Nenhuma conta pendente. Lance uma transação com data futura para vê-la aqui.</p>
                    ) : (
                      <div className="space-y-3">
                        {detail.upcoming.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50">
                            <div className={cn("w-2 h-8 rounded-full flex-shrink-0", item.type === "EXPENSE" ? "bg-red-500" : "bg-emerald-500")} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(new Date(item.date))}</p>
                            </div>
                            <span className={cn("text-sm font-semibold", item.type === "EXPENSE" ? "text-red-400" : "text-emerald-400")}>
                              {item.type === "EXPENSE" ? "-" : "+"}{formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4 text-sm">Últimas Movimentações</h4>
                    {detail.transactions.length === 0 ? (
                      <div className="text-center py-6">
                        <Receipt className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {detail.transactions.slice(0, 8).map((t) => (
                          <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/20">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{t.title}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(new Date(t.date))}</p>
                            </div>
                            <span className={cn("text-sm font-semibold", t.type === "INCOME" ? "text-emerald-400" : "text-red-400")}>
                              {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Team */}
              <TabsContent value="team" className="mt-5">
                <div className="space-y-3">
                  {detail.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 group">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {getInitials(member.name ?? member.email ?? "U")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{member.name ?? "Usuário"}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{ROLE_LABELS[member.role]}</Badge>
                      {member.role !== "OWNER" && ["OWNER", "ADMIN"].includes(c.role) && (
                        <button onClick={() => removeMember(member.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {["OWNER", "ADMIN"].includes(c.role) && <AddMemberDialog companyId={c.id} onDone={refreshAll} />}
                </div>
              </TabsContent>

              {/* Clients */}
              <TabsContent value="clients" className="mt-5">
                <div className="space-y-3">
                  {detail.clients.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Nenhum cliente cadastrado.</p>
                  ) : (
                    detail.clients.map((client) => (
                      <div key={client.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 group">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{client.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{client.email ?? client.phone ?? "Sem contato"}</p>
                        </div>
                        <button onClick={() => deleteClient(client.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                  <AddClientDialog companyId={c.id} onDone={refreshAll} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
