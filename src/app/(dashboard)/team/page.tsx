"use client";

import { motion } from "framer-motion";
import { Crown, Mail, MoreHorizontal, Plus, Shield, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TEAM_MEMBERS = [
  { name: "Rafael Mendes", email: "rafael@email.com", role: "OWNER", initials: "RM", color: "bg-emerald-500", lastActive: "Agora" },
  { name: "Ana Lima", email: "ana@email.com", role: "ADMIN", initials: "AL", color: "bg-blue-500", lastActive: "2h atrás" },
  { name: "Carlos Santos", email: "carlos@email.com", role: "FINANCIAL", initials: "CS", color: "bg-violet-500", lastActive: "Ontem" },
  { name: "Maria Silva", email: "maria@email.com", role: "VIEWER", initials: "MS", color: "bg-orange-500", lastActive: "3 dias atrás" },
];

const ROLE_CONFIG = {
  OWNER: { label: "Proprietário", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", icon: Crown },
  ADMIN: { label: "Administrador", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Shield },
  FINANCIAL: { label: "Financeiro", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: Shield },
  VIEWER: { label: "Visualização", color: "text-muted-foreground bg-muted border-border", icon: Shield },
};

export default function TeamPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Equipe</h2>
          <p className="text-sm text-muted-foreground">{TEAM_MEMBERS.length} membros ativos</p>
        </div>
        <Button variant="premium" size="sm">
          <Plus className="w-4 h-4" />
          Convidar membro
        </Button>
      </div>

      {/* Invite form */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-4">Convidar novo membro</h3>
        <div className="flex gap-3">
          <Input placeholder="email@empresa.com" className="flex-1 h-10" />
          <select className="h-10 rounded-lg border border-border bg-transparent text-sm px-3 text-foreground">
            <option value="VIEWER">Visualização</option>
            <option value="FINANCIAL">Financeiro</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <Button variant="outline" size="sm" className="h-10 px-4">
            <Mail className="w-4 h-4" />
            Enviar convite
          </Button>
        </div>
      </div>

      {/* Members list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground">
          <span>Membro</span>
          <span>Função</span>
          <span>Último acesso</span>
          <span></span>
        </div>
        <div className="divide-y divide-border">
          {TEAM_MEMBERS.map((member, i) => {
            const role = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG];
            const RoleIcon = role.icon;
            return (
              <motion.div
                key={member.email}
                className="flex sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0", member.color)}>
                    {member.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                </div>

                <div className="hidden sm:block">
                  <Badge className={cn("gap-1.5 text-xs", role.color)}>
                    <RoleIcon className="w-3 h-3" />
                    {role.label}
                  </Badge>
                </div>

                <div className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap">
                  {member.lastActive}
                </div>

                <div>
                  {member.role !== "OWNER" && (
                    <button className="w-8 h-8 rounded-lg hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors text-muted-foreground">
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Permissions */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-4">Permissões por função</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-muted-foreground font-medium py-2 pr-4 w-48">Permissão</th>
                {["Proprietário", "Administrador", "Financeiro", "Visualização"].map((r) => (
                  <th key={r} className="text-center text-xs text-muted-foreground font-medium py-2 px-4 whitespace-nowrap">{r}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[
                { perm: "Ver dashboard", access: [true, true, true, true] },
                { perm: "Adicionar transações", access: [true, true, true, false] },
                { perm: "Editar transações", access: [true, true, true, false] },
                { perm: "Exportar relatórios", access: [true, true, true, false] },
                { perm: "Gerenciar equipe", access: [true, true, false, false] },
                { perm: "Configurações", access: [true, false, false, false] },
                { perm: "Faturamento", access: [true, false, false, false] },
              ].map((row) => (
                <tr key={row.perm} className="hover:bg-muted/10">
                  <td className="py-2.5 pr-4 text-muted-foreground text-sm">{row.perm}</td>
                  {row.access.map((has, j) => (
                    <td key={j} className="text-center py-2.5 px-4">
                      {has
                        ? <span className="text-emerald-400 text-base">✓</span>
                        : <span className="text-muted-foreground/30 text-base">–</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
