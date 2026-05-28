"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2,
  Eye, EyeOff, Loader2, User, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Sua conta" },
  { id: 2, title: "Perfil" },
  { id: 3, title: "Pronto!" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [profileType, setProfileType] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar conta.");
        setLoading(false);
        return;
      }

      // Auto sign in after register
      await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      setStep(3);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => {
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div className="w-full max-w-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">FinanceOS</span>
          </Link>

          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                  step > s.id ? "bg-emerald-500 text-white" : step === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("w-12 h-0.5 rounded transition-all", step > s.id ? "bg-emerald-500" : "bg-muted")} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Criar sua conta</h2>
                  <p className="text-muted-foreground text-sm">
                    Já tem conta?{" "}
                    <Link href="/login" className="text-primary hover:underline">Entrar</Link>
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3">{error}</div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome completo</label>
                    <Input placeholder="Rafael Mendes" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Senha</label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button variant="premium" className="w-full h-11" onClick={() => setStep(2)}
                  disabled={!form.name || !form.email || form.password.length < 6}>
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Como vai usar?</h2>
                  <p className="text-muted-foreground text-sm">Personalizamos sua experiência</p>
                </div>

                <div className="grid gap-3">
                  {[
                    { id: "personal", icon: User, title: "Pessoa Física", desc: "Controle pessoal, metas e investimentos" },
                    { id: "business", icon: Building2, title: "Empresa / MEI", desc: "Gestão empresarial e fluxo de caixa" },
                  ].map((opt) => (
                    <button key={opt.id} onClick={() => setProfileType(opt.id)}
                      className={cn("flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all",
                        profileType === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-border/80")}>
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center",
                        profileType === opt.id ? "bg-primary/15" : "bg-muted")}>
                        <opt.icon className={cn("w-5 h-5", profileType === opt.id ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{opt.title}</p>
                        <p className="text-sm text-muted-foreground">{opt.desc}</p>
                      </div>
                      {profileType === opt.id && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-4 h-4" /> Voltar
                  </Button>
                  <Button variant="premium" className="flex-1 h-11" onClick={handleRegister} disabled={!profileType || loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Criar conta <ArrowRight className="w-4 h-4" /></>}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Conta criada! 🎉</h2>
                  <p className="text-muted-foreground">Bem-vindo ao FinanceOS, {form.name.split(" ")[0]}!</p>
                </div>
                <div className="text-left rounded-xl bg-muted/30 border border-border p-5 space-y-3">
                  <p className="text-sm font-semibold">Próximos passos:</p>
                  {["Adicionar suas primeiras transações", "Configurar categorias", "Definir metas financeiras", "Conectar suas contas bancárias"].map((item, i) => (
                    <div key={item} className="flex items-center gap-2.5 text-sm">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">{i + 1}</div>
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <Button variant="premium" className="w-full h-11" onClick={goToDashboard}>
                  Acessar meu dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Ao criar sua conta você concorda com os{" "}
          <Link href="#" className="hover:underline">Termos</Link> e{" "}
          <Link href="#" className="hover:underline">Privacidade</Link>
        </p>
      </motion.div>
    </div>
  );
}
