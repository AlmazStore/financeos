"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, DollarSign, Plus, TrendingDown, TrendingUp,
  Users, BarChart2, Settings, ArrowRight, CircleDot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency, formatPercentage, calculatePercentage } from "@/lib/utils";
import { mockCompanies, mockCashFlow } from "@/lib/mock-data";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";

export default function CompaniesPage() {
  const [selectedCompany, setSelectedCompany] = useState(mockCompanies[0]);

  const profitMargin = calculatePercentage(selectedCompany.profit, selectedCompany.revenue);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Empresas</h2>
          <p className="text-sm text-muted-foreground">Gerencie múltiplos CNPJs</p>
        </div>
        <Button variant="premium" size="sm">
          <Plus className="w-4 h-4" />
          Nova Empresa
        </Button>
      </div>

      {/* Company selector */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {mockCompanies.map((company) => (
          <button
            key={company.id}
            onClick={() => setSelectedCompany(company)}
            className={cn(
              "rounded-xl border p-5 text-left transition-all hover:shadow-md",
              selectedCompany.id === company.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: company.color + "20" }}
              >
                <Building2 className="w-5 h-5" style={{ color: company.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{company.name}</p>
                <p className="text-xs text-muted-foreground">{company.cnpj}</p>
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

        <button className="rounded-xl border-2 border-dashed border-border p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all group">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium">Nova empresa</span>
        </button>
      </div>

      {/* Company details */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div
          className="p-5 border-b border-border"
          style={{ background: `linear-gradient(135deg, ${selectedCompany.color}15, transparent)` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: selectedCompany.color + "20" }}
              >
                <Building2 className="w-6 h-6" style={{ color: selectedCompany.color }} />
              </div>
              <div>
                <h3 className="text-lg font-bold">{selectedCompany.name}</h3>
                <p className="text-sm text-muted-foreground">CNPJ: {selectedCompany.cnpj}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4" />
                Equipe
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Receita Total", value: selectedCompany.revenue, color: "text-emerald-400", icon: TrendingUp },
              { label: "Despesas", value: selectedCompany.expenses, color: "text-red-400", icon: TrendingDown },
              { label: "Lucro Líquido", value: selectedCompany.profit, color: "text-violet-400", icon: DollarSign },
              { label: "Margem de Lucro", value: null, label2: formatPercentage(profitMargin), color: "text-blue-400", icon: BarChart2 },
            ].map((kpi, i) => (
              <div key={i} className="rounded-xl bg-muted/30 border border-border/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <p className={cn("text-xl font-bold", kpi.color)}>
                  {kpi.value !== null ? formatCurrency(kpi.value) : (kpi as any).label2}
                </p>
              </div>
            ))}
          </div>

          <Tabs defaultValue="cashflow">
            <TabsList>
              <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="team">Equipe</TabsTrigger>
              <TabsTrigger value="clients">Clientes</TabsTrigger>
            </TabsList>

            <TabsContent value="cashflow" className="mt-5">
              <div className="grid xl:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-4 text-sm">Próximos Vencimentos</h4>
                  <div className="space-y-3">
                    {[
                      { name: "Aluguel escritório", amount: 3500, date: "05/02", type: "payable" },
                      { name: "Folha de pagamento", amount: 8200, date: "05/02", type: "payable" },
                      { name: "Cliente: Agência X", amount: 5000, date: "10/02", type: "receivable" },
                      { name: "Fatura de serviços", amount: 2200, date: "15/02", type: "receivable" },
                      { name: "Fornecedor TI", amount: 1800, date: "20/02", type: "payable" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-muted/20 transition-colors">
                        <div className={cn(
                          "w-2 h-8 rounded-full flex-shrink-0",
                          item.type === "payable" ? "bg-red-500" : "bg-emerald-500"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.date}</p>
                        </div>
                        <span className={cn(
                          "text-sm font-semibold",
                          item.type === "payable" ? "text-red-400" : "text-emerald-400"
                        )}>
                          {item.type === "payable" ? "-" : "+"}{formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-4 text-sm">Projeção 30 dias</h4>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={mockCashFlow}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Bar dataKey="receivable" name="Receber" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="payable" name="Pagar" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="team" className="mt-5">
              <div className="space-y-3">
                {[
                  { name: "Pedro Alves", role: "Administrador", email: "pedro@studio.com", color: "bg-blue-500", initials: "PA" },
                  { name: "Ana Lima", role: "Financeiro", email: "ana@studio.com", color: "bg-emerald-500", initials: "AL" },
                  { name: "Carlos Santos", role: "Visualização", email: "carlos@studio.com", color: "bg-orange-500", initials: "CS" },
                ].map((member) => (
                  <div key={member.name} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:bg-muted/20 transition-colors">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0", member.color)}>
                      {member.initials}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{member.role}</Badge>
                  </div>
                ))}
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4" />
                  Convidar membro
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="clients" className="mt-5">
              <div className="space-y-3">
                {[
                  { name: "Agência Digital X", total: 15000, pending: 5000, status: "active" },
                  { name: "Startup TechBR", total: 8500, pending: 0, status: "paid" },
                  { name: "Consultoria Alpha", total: 12000, pending: 4000, status: "active" },
                ].map((client) => (
                  <div key={client.name} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:bg-muted/20 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{client.name}</p>
                      <p className="text-xs text-muted-foreground">Total: {formatCurrency(client.total)}</p>
                    </div>
                    <div className="text-right">
                      {client.pending > 0 ? (
                        <p className="text-sm font-semibold text-yellow-400">{formatCurrency(client.pending)} pendente</p>
                      ) : (
                        <Badge variant="success">Em dia</Badge>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4" />
                  Novo cliente
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
