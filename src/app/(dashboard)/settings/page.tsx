"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Shield, Loader2, Check, Download, Trash2, Moon, Sun, Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { getInitials } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();

  const [name, setName] = useState(session?.user?.name ?? "");
  const [savingName, setSavingName] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const email = session?.user?.email ?? "";

  const saveName = async () => {
    if (name.trim().length < 2) { toast("Informe um nome válido.", "error"); return; }
    setSavingName(true);
    try {
      const res = await fetch("/api/user", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error();
      await update?.({ name }).catch(() => {});
      toast("Nome atualizado!", "success");
    } catch { toast("Erro ao salvar.", "error"); }
    finally { setSavingName(false); }
  };

  const changePassword = async () => {
    if (next.length < 6) { toast("A nova senha precisa ter ao menos 6 caracteres.", "error"); return; }
    if (next !== confirm) { toast("As senhas não coincidem.", "error"); return; }
    setSavingPass(true);
    try {
      const res = await fetch("/api/user/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, next }) });
      const json = await res.json();
      if (!res.ok) { toast(json.error ?? "Erro ao alterar senha.", "error"); return; }
      toast("Senha alterada com sucesso!", "success");
      setCurrent(""); setNext(""); setConfirm("");
    } catch { toast("Erro ao alterar senha.", "error"); }
    finally { setSavingPass(false); }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/user/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `financeos-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Download iniciado.", "success");
    } catch { toast("Erro ao exportar.", "error"); }
    finally { setExporting(false); }
  };

  const resetAccount = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/user/reset", { method: "POST" });
      if (!res.ok) throw new Error();
      toast("Conta zerada! Recomeçando do zero.", "success");
      router.push("/onboarding");
      router.refresh();
    } catch { toast("Erro ao zerar a conta.", "error"); setResetting(false); }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await signOut({ redirect: false });
      router.push("/");
    } catch { toast("Erro ao excluir conta.", "error"); setDeleting(false); }
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
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="data">Meus dados</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
                {getInitials(name || email || "U")}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{name || "Usuário"}</p>
                <p className="text-sm text-muted-foreground truncate">{email}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h3 className="font-semibold">Informações pessoais</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome completo</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={email} className="h-10" type="email" disabled />
                </div>
              </div>
              <Button variant="premium" onClick={saveName} disabled={savingName}>
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar alterações"}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-4">Aparência</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Tema</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="gap-2">
                  {theme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  {theme === "dark" ? "Escuro" : "Claro"}
                </Button>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold">Alterar senha</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha atual</label>
                  <Input type="password" placeholder="••••••••" className="h-10" value={current} onChange={(e) => setCurrent(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nova senha</label>
                  <Input type="password" placeholder="Mínimo 6 caracteres" className="h-10" value={next} onChange={(e) => setNext(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirmar nova senha</label>
                  <Input type="password" placeholder="Repita a nova senha" className="h-10" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
              </div>
              <Button variant="outline" onClick={changePassword} disabled={savingPass || !current || !next}>
                {savingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : "Alterar senha"}
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">Sua senha é armazenada com criptografia (bcrypt). Nunca compartilhamos seus dados.</p>
            </div>
          </motion.div>
        </TabsContent>

        {/* Data */}
        <TabsContent value="data">
          <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold mb-2">Exportar meus dados</h3>
              <p className="text-sm text-muted-foreground mb-4">Baixe um arquivo com todas as suas transações, categorias, metas, orçamentos e contas.</p>
              <Button variant="outline" onClick={exportData} disabled={exporting} className="gap-2">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Exportar (JSON)
              </Button>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
              <h3 className="font-semibold mb-2">Recomeçar do zero</h3>
              <p className="text-sm text-muted-foreground mb-4">Apaga todas as suas transações, metas, orçamentos, recorrentes e empresas, recria as categorias padrão e refaz o onboarding — sem perder seu login. Ótimo para testar o app como um novo usuário.</p>
              <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-2" onClick={() => setResetOpen(true)}>
                <RotateCcw className="w-3.5 h-3.5" />
                Zerar minha conta
              </Button>
            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
              <h3 className="font-semibold text-red-400 mb-2">Zona de perigo</h3>
              <p className="text-sm text-muted-foreground mb-4">Excluir sua conta remove permanentemente todas as suas transações, metas e dados. Esta ação é irreversível.</p>
              <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-2" onClick={() => setDelOpen(true)}>
                <Trash2 className="w-3.5 h-3.5" />
                Excluir minha conta
              </Button>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Reset confirm */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zerar conta</DialogTitle>
            <DialogDescription>
              Isso apaga todas as transações, metas, orçamentos, recorrentes e empresas, e refaz o onboarding. Seu login permanece. Não dá para desfazer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancelar</Button>
            <Button onClick={resetAccount} disabled={resetting} className="bg-amber-500 hover:bg-amber-600 text-white">
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Zerar tudo e recomeçar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conta</DialogTitle>
            <DialogDescription>
              Tem certeza? Todos os seus dados serão apagados permanentemente e não poderão ser recuperados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelOpen(false)}>Cancelar</Button>
            <Button onClick={deleteAccount} disabled={deleting} className="bg-red-500 hover:bg-red-600 text-white">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sim, excluir tudo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
