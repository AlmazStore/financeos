"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell, CreditCard, Globe, Lock, Moon, Palette, Shield,
  Sun, User, Wallet, Check, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { mockUser } from "@/lib/mock-data";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[900px]">
      <div>
        <h2 className="text-xl font-bold">Configurações</h2>
        <p className="text-sm text-muted-foreground">Gerencie sua conta e preferências</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="billing">Assinatura</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Avatar */}
            <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
                RM
              </div>
              <div>
                <p className="font-semibold">{mockUser.name}</p>
                <p className="text-sm text-muted-foreground mb-3">{mockUser.email}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Alterar foto</Button>
                  <Button variant="ghost" size="sm">Remover</Button>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h3 className="font-semibold">Informações pessoais</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome completo</label>
                  <Input defaultValue={mockUser.name ?? ""} className="h-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input defaultValue={mockUser.email} className="h-10" type="email" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone</label>
                  <Input placeholder="+55 (11) 99999-9999" className="h-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CPF/CNPJ</label>
                  <Input placeholder="000.000.000-00" className="h-10" />
                </div>
              </div>
              <Button variant="premium" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : "Salvar alterações"}
              </Button>
            </div>

            {/* Preferences */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold">Preferências</h3>
              {[
                { icon: Globe, label: "Idioma", value: "Português (BR)" },
                { icon: CreditCard, label: "Moeda padrão", value: "BRL - Real Brasileiro" },
                { icon: Palette, label: "Tema", value: "Dark" },
              ].map((pref) => (
                <div key={pref.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <pref.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{pref.label}</span>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">{pref.value}</Button>
                </div>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="notifications">
          <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold">Alertas e Notificações</h3>
              {[
                { title: "Vencimentos próximos", desc: "Avisar 3 dias antes de contas venceram", default: true },
                { title: "Meta atingida", desc: "Comemorar quando completar uma meta", default: true },
                { title: "Gasto acima da média", desc: "Alertar quando gastar mais que o usual em uma categoria", default: true },
                { title: "Relatório semanal", desc: "Resumo financeiro toda segunda-feira", default: false },
                { title: "Dicas financeiras", desc: "Sugestões personalizadas da IA", default: true },
                { title: "Novidades do produto", desc: "Informações sobre novas funcionalidades", default: false },
              ].map((notif) => (
                <div key={notif.title} className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-xs text-muted-foreground">{notif.desc}</p>
                  </div>
                  <div
                    className={cn(
                      "relative w-10 h-5.5 rounded-full cursor-pointer transition-colors flex-shrink-0 mt-0.5",
                      notif.default ? "bg-emerald-500" : "bg-muted"
                    )}
                    style={{ width: "40px", height: "22px" }}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                      notif.default ? "left-[calc(100%-18px)]" : "left-0.5"
                    )} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="billing">
          <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Current plan */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">Plano Pro</h3>
                    <Badge variant="success">Ativo</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">R$ 29,90/mês · Renova em 15/02/2024</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">R$ 29,90</p>
                  <p className="text-xs text-muted-foreground">/mês</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm">Gerenciar assinatura</Button>
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">Cancelar</Button>
              </div>
            </div>

            {/* Usage */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">Uso do plano</h3>
              <div className="space-y-4">
                {[
                  { label: "Transações este mês", current: 12, total: "Ilimitado" },
                  { label: "Contas cadastradas", current: 4, total: "Ilimitado" },
                  { label: "Empresas", current: 2, total: "Ilimitado" },
                  { label: "Membros da equipe", current: 3, total: "Ilimitado" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-medium">
                      {item.current} / {item.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="security">
          <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold">Alterar senha</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha atual</label>
                  <Input type="password" placeholder="••••••••" className="h-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nova senha</label>
                  <Input type="password" placeholder="Mínimo 8 caracteres" className="h-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirmar nova senha</label>
                  <Input type="password" placeholder="Repita a nova senha" className="h-10" />
                </div>
              </div>
              <Button variant="outline">Alterar senha</Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">Autenticação de dois fatores</h3>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium">2FA por app autenticador</p>
                    <p className="text-xs text-muted-foreground">Adicione uma camada extra de segurança</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Ativar</Button>
              </div>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
              <h3 className="font-semibold text-red-400 mb-2">Zona de perigo</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Estas ações são irreversíveis. Tenha certeza antes de prosseguir.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  Exportar todos os dados
                </Button>
                <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  Excluir conta
                </Button>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
