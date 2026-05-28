"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { ArrowLeft, Eye, EyeOff, Github, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Email ou senha inválidos.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-950 via-background to-violet-950 p-12 flex-col justify-between">
        <div className="absolute inset-0 dot-pattern opacity-40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-emerald-500/20 via-transparent to-transparent" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">FinanceOS</span>
          </Link>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Bem-vindo de volta ao
            <br />
            <span className="text-emerald-400">controle total</span>
          </h2>
          <p className="text-white/60 text-lg">
            Suas finanças te esperam com insights frescos e relatórios atualizados.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Usuários ativos", value: "47.000+" },
              { label: "Satisfação", value: "98%" },
              { label: "Volume gerenciado", value: "R$ 2.1B" },
              { label: "Avaliação", value: "4.9/5 ⭐" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-white/50 text-xs mb-1">{s.label}</p>
                <p className="text-white font-bold text-lg">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/30 text-sm">
          &ldquo;O FinanceOS me ajudou a economizar R$ 24.000 em 6 meses.&rdquo;
          <span className="block text-white/40 text-xs mt-1">— Rafael M., usuário Pro</span>
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao início
            </Link>
            <h1 className="text-2xl font-bold mb-2">Entrar na sua conta</h1>
            <p className="text-muted-foreground text-sm">
              Novo por aqui?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Criar conta grátis
              </Link>
            </p>
          </div>

          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Senha</label>
                  <Link href="#" className="text-xs text-primary hover:underline">Esqueci a senha</Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="premium" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground">
              Ao entrar, você concorda com os{" "}
              <Link href="#" className="hover:underline">Termos</Link> e{" "}
              <Link href="#" className="hover:underline">Privacidade</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
