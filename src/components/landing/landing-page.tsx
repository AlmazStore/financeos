"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight, BarChart3, Bell, Bot, Building2, Check,
  ChevronRight, CreditCard, Globe, Layout, LineChart,
  Lock, PieChart, Plus, Shield, Sparkles, Star,
  TrendingUp, Users, Wallet, Zap, X, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Dashboard Visual",
    description: "Veja toda sua vida financeira em uma tela. Gráficos interativos que fazem sentido.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Bot,
    title: "IA Financeira",
    description: "Insights automáticos, previsões e sugestões de economia com inteligência artificial.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    icon: Building2,
    title: "Multi-Empresa",
    description: "Gerencie múltiplas empresas com CNPJs separados e equipes independentes.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: TrendingUp,
    title: "Metas Financeiras",
    description: "Defina objetivos, acompanhe progresso e receba previsões de quando vai alcançar.",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
  {
    icon: Zap,
    title: "Automação Total",
    description: "Categorização automática, alertas inteligentes e recorrências sem esforço.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    icon: LineChart,
    title: "Relatórios Pro",
    description: "DRE, fluxo de caixa, análises comparativas e exportação em PDF/CSV.",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: 0,
    description: "Para quem quer começar a se organizar",
    features: [
      "Até 100 transações/mês",
      "1 conta bancária",
      "Dashboard básico",
      "Categorias padrão",
      "Exportação CSV",
    ],
    cta: "Começar grátis",
    variant: "outline" as const,
    popular: false,
  },
  {
    name: "Pro",
    price: 29.90,
    description: "Para quem leva finanças a sério",
    features: [
      "Transações ilimitadas",
      "Contas ilimitadas",
      "Dashboard avançado",
      "IA Financeira",
      "Metas e orçamentos",
      "Relatórios completos",
      "Exportação PDF/CSV",
      "Alertas inteligentes",
    ],
    cta: "Começar 14 dias grátis",
    variant: "premium" as const,
    popular: true,
  },
  {
    name: "Business",
    price: 79.90,
    description: "Para empresas que precisam de controle total",
    features: [
      "Tudo do Pro",
      "Multi-empresa",
      "Equipe ilimitada",
      "DRE empresarial",
      "Gestão de clientes",
      "API de integração",
      "Suporte prioritário",
      "Onboarding dedicado",
    ],
    cta: "Falar com vendas",
    variant: "purple" as const,
    popular: false,
  },
];

const TESTIMONIALS = [
  {
    name: "Carla Menezes",
    role: "Designer Freelancer",
    avatar: "CM",
    color: "bg-violet-500",
    text: "Finalmente parei de usar planilha! O FinanceOS me mostrou que eu gastava 40% da renda em coisas que nem lembrava. Em 3 meses economizei R$ 8.000.",
    rating: 5,
  },
  {
    name: "Pedro Alves",
    role: "CEO — Studio Digital",
    avatar: "PA",
    color: "bg-blue-500",
    text: "Gerencio 3 empresas pelo FinanceOS. O módulo empresarial é incrível. Fluxo de caixa, DRE e equipe tudo num lugar só. Substituiu 4 planilhas diferentes.",
    rating: 5,
  },
  {
    name: "Ana Costa",
    role: "Médica e Investidora",
    avatar: "AC",
    color: "bg-emerald-500",
    text: "A IA financeira do app identificou um padrão nos meus gastos que eu nunca teria visto. Reduzi despesas em 25% e aumentei meus investimentos.",
    rating: 5,
  },
];

const STATS = [
  { value: "47.000+", label: "Usuários ativos" },
  { value: "R$ 2.1B", label: "Gerenciados na plataforma" },
  { value: "98%", label: "Taxa de satisfação" },
  { value: "4.9/5", label: "Avaliação nas lojas" },
];

function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border/50 py-3"
          : "py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">FinanceOS</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {["Recursos", "Empresas", "Preços", "Blog"].map((item) => (
            <Link
              key={item}
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button variant="premium" size="sm" asChild>
            <Link href="/register">
              Começar grátis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-accent"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl px-4 py-4 space-y-3"
        >
          {["Recursos", "Empresas", "Preços", "Blog"].map((item) => (
            <Link
              key={item}
              href="#"
              className="block text-sm py-2 text-muted-foreground hover:text-foreground"
            >
              {item}
            </Link>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Button variant="outline" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button variant="premium" asChild>
              <Link href="/register">Começar grátis</Link>
            </Button>
          </div>
        </motion.div>
      )}
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-emerald-500/20 via-transparent to-transparent" />
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-gradient-radial from-violet-500/10 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="success" className="mb-6 px-4 py-1.5 text-sm inline-flex gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            IA Financeira incluída em todos os planos Pro
          </Badge>
        </motion.div>

        <motion.h1
          className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Pare de perder dinheiro
          <br />
          <span className="gradient-text">em planilhas</span>
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          O FinanceOS substitui suas planilhas bagunçadas por uma plataforma financeira
          inteligente. Controle entradas, saídas, metas e investimentos com a{" "}
          <span className="text-foreground font-medium">precisão de um CFO</span>.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Button size="xl" variant="premium" asChild className="h-14 text-base">
            <Link href="/register">
              Começar grátis agora
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          <Button size="xl" variant="outline" asChild className="h-14 text-base">
            <Link href="/dashboard">
              Ver demo ao vivo
              <ChevronRight className="w-5 h-5" />
            </Link>
          </Button>
        </motion.div>

        <motion.p
          className="mt-4 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Grátis para sempre no plano básico · Sem cartão de crédito · Setup em 2 minutos
        </motion.p>

        {/* Dashboard Preview */}
        <motion.div
          className="mt-16 relative"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="relative mx-auto max-w-5xl">
            {/* Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-violet-500/20 to-emerald-500/20 rounded-2xl blur-2xl" />

            {/* Mock Dashboard */}
            <div className="relative rounded-2xl border border-border/50 bg-card overflow-hidden shadow-2xl">
              {/* Top bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-card/80">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <div className="flex-1 mx-4">
                  <div className="bg-secondary rounded-md px-3 py-1 text-xs text-muted-foreground text-center w-48 mx-auto">
                    app.financeos.com/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="grid grid-cols-12 min-h-[480px]">
                {/* Sidebar */}
                <div className="col-span-2 border-r border-border/30 p-4 space-y-1 bg-sidebar">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
                      <Wallet className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-xs font-bold">FinanceOS</span>
                  </div>
                  {[
                    { icon: Layout, label: "Dashboard", active: true },
                    { icon: CreditCard, label: "Transações" },
                    { icon: PieChart, label: "Categorias" },
                    { icon: TrendingUp, label: "Metas" },
                    { icon: BarChart3, label: "Relatórios" },
                    { icon: Building2, label: "Empresas" },
                  ].map(({ icon: Icon, label, active }) => (
                    <div
                      key={label}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs",
                        active
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "text-muted-foreground"
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="col-span-10 p-5 space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Saldo Total", value: "R$ 63.640", change: "+12,4%", positive: true },
                      { label: "Entradas do Mês", value: "R$ 10.700", change: "+8,2%", positive: true },
                      { label: "Saídas do Mês", value: "R$ 5.349", change: "-3,1%", positive: false },
                      { label: "Economia", value: "R$ 5.351", change: "+47%", positive: true },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl border border-border/50 bg-card/50 p-3">
                        <p className="text-[10px] text-muted-foreground mb-1">{stat.label}</p>
                        <p className="text-sm font-bold">{stat.value}</p>
                        <span className={cn("text-[10px] font-medium", stat.positive ? "text-emerald-400" : "text-red-400")}>
                          {stat.change}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Chart area */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 rounded-xl border border-border/50 bg-card/50 p-3 h-36">
                      <p className="text-[10px] text-muted-foreground mb-2">Evolução Mensal</p>
                      <div className="flex items-end gap-1 h-20">
                        {[65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 100].map((h, i) => (
                          <div key={i} className="flex-1 flex flex-col gap-0.5">
                            <div
                              className="rounded-sm bg-emerald-500/30"
                              style={{ height: `${h * 0.6}%` }}
                            />
                            <div
                              className="rounded-sm bg-red-500/30"
                              style={{ height: `${(100 - h) * 0.35}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-card/50 p-3 h-36">
                      <p className="text-[10px] text-muted-foreground mb-2">Por Categoria</p>
                      <div className="space-y-1.5 mt-2">
                        {[
                          { name: "Moradia", pct: 37, color: "bg-red-500" },
                          { name: "Alimentação", pct: 12, color: "bg-yellow-500" },
                          { name: "Investimentos", pct: 19, color: "bg-violet-500" },
                          { name: "Saúde", pct: 8, color: "bg-teal-500" },
                        ].map((c) => (
                          <div key={c.name} className="flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full", c.color)} />
                            <span className="text-[9px] text-muted-foreground flex-1">{c.name}</span>
                            <div className="flex-1 bg-secondary rounded-full h-1">
                              <div className={cn("h-1 rounded-full", c.color)} style={{ width: `${c.pct}%` }} />
                            </div>
                            <span className="text-[9px] font-medium">{c.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Transactions */}
                  <div className="rounded-xl border border-border/50 bg-card/50 p-3">
                    <p className="text-[10px] text-muted-foreground mb-2">Últimas Transações</p>
                    <div className="space-y-1.5">
                      {[
                        { name: "Salário", amount: "+R$ 8.500", type: "income", cat: "💼" },
                        { name: "Aluguel", amount: "-R$ 1.800", type: "expense", cat: "🏠" },
                        { name: "Freelance Design", amount: "+R$ 2.200", type: "income", cat: "💻" },
                      ].map((t) => (
                        <div key={t.name} className="flex items-center gap-2">
                          <span className="text-sm">{t.cat}</span>
                          <span className="flex-1 text-[10px]">{t.name}</span>
                          <span className={cn("text-[10px] font-semibold", t.type === "income" ? "text-emerald-400" : "text-red-400")}>
                            {t.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="py-16 border-y border-border/50 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-3xl md:text-4xl font-bold gradient-text mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge variant="purple" className="mb-4">Recursos</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Tudo que você precisa para
            <br />
            <span className="gradient-text">dominar suas finanças</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa que substitui planilhas, apps bancários e consultores financeiros.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group relative rounded-2xl border border-border/50 bg-card/50 p-6 hover:border-border hover:bg-card transition-all duration-300 hover:shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", feature.bg)}>
                <feature.icon className={cn("w-6 h-6", feature.color)} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PainSection() {
  return (
    <section className="py-24 bg-card/30 border-y border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="danger" className="mb-4">O problema</Badge>
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              Você já se sentiu assim
              <br />
              <span className="text-muted-foreground">com suas finanças?</span>
            </h2>
            <div className="space-y-4">
              {[
                "Planilha bagunçada que ninguém entende mais",
                "Não saber para onde o dinheiro vai todo mês",
                "Descobrir no extrato gastos que esqueceu",
                "Mês acabando e sem dinheiro pra pagar contas",
                "Medo de olhar o saldo da conta",
                "3 apps diferentes que não se conversam",
              ].map((pain, i) => (
                <motion.div
                  key={pain}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-red-400" />
                  </div>
                  <span className="text-muted-foreground">{pain}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="success" className="mb-4">A solução</Badge>
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              Com FinanceOS você vai
              <br />
              <span className="gradient-text">ter controle total</span>
            </h2>
            <div className="space-y-4">
              {[
                "Dashboard visual que você entende em segundos",
                "Categorização automática com IA",
                "Alertas antes das contas vencerem",
                "Previsão de saldo para os próximos meses",
                "Relatórios que mostram seus padrões de gasto",
                "Uma plataforma que sincroniza tudo",
              ].map((solution, i) => (
                <motion.div
                  key={solution}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span>{solution}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="py-24" id="precos">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge variant="info" className="mb-4">Preços</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Investimento que se paga
            <br />
            <span className="gradient-text">no primeiro mês</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            A maioria dos usuários economiza mais do que o plano custa em 30 dias.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={cn(
                "relative rounded-2xl border p-8 flex flex-col",
                plan.popular
                  ? "border-emerald-500/50 bg-gradient-to-b from-emerald-500/10 to-card shadow-xl shadow-emerald-500/10"
                  : "border-border/50 bg-card/50"
              )}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="success" className="px-3 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Mais popular
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-bold">Grátis</span>
                  ) : (
                    <>
                      <span className="text-lg text-muted-foreground">R$</span>
                      <span className="text-4xl font-bold">{plan.price.toFixed(2).replace(".", ",")}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button variant={plan.variant} size="lg" className="w-full" asChild>
                <Link href={plan.price === 0 ? "/register" : plan.name === "Business" ? "#" : "/register"}>
                  {plan.cta}
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section className="py-24 bg-card/30 border-y border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Badge variant="warning" className="mb-4">Depoimentos</Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            47.000 pessoas já
            <br />
            <span className="gradient-text">transformaram suas finanças</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              className="rounded-2xl border border-border/50 bg-card/50 p-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold", t.color)}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Sua vida financeira
            <br />
            <span className="gradient-text">começa hoje</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Junte-se a 47.000 pessoas que pararam de perder dinheiro e começaram a construir riqueza com o FinanceOS.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="xl" variant="premium" asChild className="h-14 text-base animate-pulse-glow">
              <Link href="/register">
                Criar conta grátis agora
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" asChild className="h-14 text-base">
              <Link href="/dashboard">
                Explorar dashboard
              </Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-emerald-400" /> Dados 100% seguros</span>
            <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-emerald-400" /> Criptografia de ponta</span>
            <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-emerald-400" /> Servidores no Brasil</span>
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-400" /> Suporte em português</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">FinanceOS</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A plataforma financeira mais inteligente do Brasil. Para pessoas e empresas.
            </p>
          </div>
          {[
            {
              title: "Produto",
              links: ["Recursos", "Preços", "Changelog", "Roadmap"],
            },
            {
              title: "Empresa",
              links: ["Sobre", "Blog", "Carreiras", "Imprensa"],
            },
            {
              title: "Suporte",
              links: ["Documentação", "Status", "Contato", "Privacidade"],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 FinanceOS. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            Feito com ❤️ para quem leva dinheiro a sério
          </p>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <PainSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
