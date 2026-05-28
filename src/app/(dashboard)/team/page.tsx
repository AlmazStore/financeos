"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Loader2, Building2, ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAutoRefresh } from "@/lib/events";

type Company = {
  id: string; name: string; cnpj: string | null; color: string | null;
  role: string; membersCount: number; clientsCount: number;
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Dono", ADMIN: "Administrador", FINANCIAL: "Financeiro", VIEWER: "Visualização",
};

export default function TeamPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/companies").then((r) => r.json()).then((d) => setCompanies(d.companies ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[900px]">
      <div>
        <h2 className="text-xl font-bold">Equipe</h2>
        <p className="text-sm text-muted-foreground">Convide pessoas e defina permissões dentro de cada empresa</p>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Users}
            title="Nenhuma empresa para gerenciar equipe"
            description="A equipe é organizada por empresa: cada negócio tem seus próprios membros e permissões. Crie uma empresa para começar a convidar pessoas."
            action={<Button variant="premium" asChild><Link href="/companies">Criar empresa</Link></Button>}
          />
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              A equipe é gerenciada <strong>dentro de cada empresa</strong>. Abra uma empresa e use a aba <strong>Equipe</strong> para convidar membros (por email) e definir permissões.
            </p>
          </div>

          <div className="space-y-3">
            {companies.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.3) }}
                className="rounded-xl border border-border bg-card p-4 flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (c.color ?? "#8b5cf6") + "20" }}>
                  <Building2 className="w-5 h-5" style={{ color: c.color ?? "#8b5cf6" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{c.name}</p>
                    {c.role === "OWNER" && <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.membersCount} {c.membersCount === 1 ? "membro" : "membros"} · você é {ROLE_LABEL[c.role] ?? "membro"}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/companies">Gerenciar <ArrowRight className="w-3.5 h-3.5" /></Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
