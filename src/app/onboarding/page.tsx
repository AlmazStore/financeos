"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Wallet, User, Briefcase,
  Building2, Building, Target, PiggyBank, TrendingUp,
  CreditCard, LineChart, ShoppingCart, Home, Car,
  Heart, Gamepad2, Tv, GraduationCap, Users, Check,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 5;

type FormData = {
  profileType: string;
  mainGoal: string;
  monthlyRevenue: string;
  mainExpenses: string[];
  hasTeam: boolean;
};

const PROFILES = [
  { id: "PERSONAL", label: "Pessoal", desc: "Controlo minhas finanças pessoais e familiares", icon: User, color: "from-blue-400 to-blue-600" },
  { id: "FREELANCER", label: "Freelancer", desc: "Trabalho por conta própria e preciso organizar minha renda variável", icon: Briefcase, color: "from-purple-400 to-purple-600" },
  { id: "SMALL_BUSINESS", label: "Pequena Empresa", desc: "Tenho um negócio e preciso controlar as finanças da empresa", icon: Building2, color: "from-emerald-400 to-emerald-600" },
  { id: "ENTERPRISE", label: "Empresa / Corporativo", desc: "Gerencio finanças de uma empresa de médio/grande porte", icon: Building, color: "from-orange-400 to-orange-600" },
];

const GOALS = [
  { id: "SAVE_MONEY", label: "Economizar dinheiro", desc: "Quero poupar mais e criar reservas", icon: PiggyBank, color: "text-emerald-400" },
  { id: "CONTROL_SPENDING", label: "Controlar gastos", desc: "Preciso entender para onde vai meu dinheiro", icon: CreditCard, color: "text-blue-400" },
  { id: "GROW_BUSINESS", label: "Crescer meu negócio", desc: "Quero aumentar receitas e expandir", icon: TrendingUp, color: "text-orange-400" },
  { id: "PAY_DEBT", label: "Quitar dívidas", desc: "Preciso organizar e eliminar minhas dívidas", icon: Target, color: "text-red-400" },
  { id: "INVEST", label: "Investir melhor", desc: "Quero fazer meu dinheiro trabalhar por mim", icon: LineChart, color: "text-purple-400" },
];

const REVENUE_RANGES = [
  { id: "UNDER_2K", label: "Até R$ 2.000", sub: "Renda inicial" },
  { id: "FROM_2K_TO_5K", label: "R$ 2.000 – R$ 5.000", sub: "Renda moderada" },
  { id: "FROM_5K_TO_15K", label: "R$ 5.000 – R$ 15.000", sub: "Renda consolidada" },
  { id: "FROM_15K_TO_50K", label: "R$ 15.000 – R$ 50.000", sub: "Renda elevada" },
  { id: "OVER_50K", label: "Acima de R$ 50.000", sub: "Alta renda / Empresa" },
];

const EXPENSES = [
  { id: "Alimentação", label: "Alimentação", icon: ShoppingCart },
  { id: "Moradia", label: "Moradia / Aluguel", icon: Home },
  { id: "Transporte", label: "Transporte", icon: Car },
  { id: "Saúde", label: "Saúde", icon: Heart },
  { id: "Lazer", label: "Lazer", icon: Gamepad2 },
  { id: "Assinaturas", label: "Assinaturas", icon: Tv },
  { id: "Educação", label: "Educação", icon: GraduationCap },
  { id: "Salários", label: "Salários / Equipe", icon: Users },
];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className={cn(
            "h-1.5 flex-1 rounded-full transition-all duration-500",
            i < step ? "bg-emerald-400" : i === step ? "bg-emerald-400/50" : "bg-white/10"
          )} />
        </div>
      ))}
    </div>
  );
}

function OptionCard({ selected, onClick, children, className }: {
  selected: boolean; onClick: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer",
        selected
          ? "border-emerald-400 bg-emerald-400/10"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8",
        className
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-black" />
        </motion.div>
      )}
      {children}
    </motion.button>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    profileType: "",
    mainGoal: "",
    monthlyRevenue: "",
    mainExpenses: [],
    hasTeam: false,
  });

  const canNext = () => {
    if (step === 0) return !!form.profileType;
    if (step === 1) return !!form.mainGoal;
    if (step === 2) return !!form.monthlyRevenue;
    if (step === 3) return form.mainExpenses.length > 0;
    return true;
  };

  const go = (dir: 1 | -1) => {
    setDirection(dir);
    setStep((s) => s + dir);
  };

  const toggleExpense = (id: string) => {
    setForm((f) => ({
      ...f,
      mainExpenses: f.mainExpenses.includes(id)
        ? f.mainExpenses.filter((e) => e !== id)
        : [...f.mainExpenses, id],
    }));
  };

  const submit = async () => {
    setLoading(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      router.push("/dashboard");
    } catch {
      setLoading(false);
    }
  };

  const steps = [
    // Step 0 — Profile
    <div key="profile">
      <h2 className="text-2xl font-bold mb-2">Qual é o seu perfil?</h2>
      <p className="text-white/50 mb-6 text-sm">Isso nos ajuda a personalizar seu dashboard</p>
      <div className="space-y-3">
        {PROFILES.map((p) => (
          <OptionCard key={p.id} selected={form.profileType === p.id} onClick={() => setForm((f) => ({ ...f, profileType: p.id }))}>
            <div className="flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0", p.color)}>
                <p.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">{p.label}</p>
                <p className="text-xs text-white/50 mt-0.5">{p.desc}</p>
              </div>
            </div>
          </OptionCard>
        ))}
      </div>
    </div>,

    // Step 1 — Goal
    <div key="goal">
      <h2 className="text-2xl font-bold mb-2">Qual é o seu principal objetivo?</h2>
      <p className="text-white/50 mb-6 text-sm">Vamos focar nas métricas que mais importam para você</p>
      <div className="space-y-3">
        {GOALS.map((g) => (
          <OptionCard key={g.id} selected={form.mainGoal === g.id} onClick={() => setForm((f) => ({ ...f, mainGoal: g.id }))}>
            <div className="flex items-center gap-4">
              <g.icon className={cn("w-6 h-6 flex-shrink-0", g.color)} />
              <div>
                <p className="font-semibold text-sm">{g.label}</p>
                <p className="text-xs text-white/50 mt-0.5">{g.desc}</p>
              </div>
            </div>
          </OptionCard>
        ))}
      </div>
    </div>,

    // Step 2 — Revenue
    <div key="revenue">
      <h2 className="text-2xl font-bold mb-2">Qual é a sua renda mensal?</h2>
      <p className="text-white/50 mb-6 text-sm">Isso é confidencial e não será compartilhado</p>
      <div className="space-y-3">
        {REVENUE_RANGES.map((r) => (
          <OptionCard key={r.id} selected={form.monthlyRevenue === r.id} onClick={() => setForm((f) => ({ ...f, monthlyRevenue: r.id }))}>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{r.label}</p>
              <p className="text-xs text-white/40">{r.sub}</p>
            </div>
          </OptionCard>
        ))}
      </div>
    </div>,

    // Step 3 — Expenses
    <div key="expenses">
      <h2 className="text-2xl font-bold mb-2">Quais são seus maiores gastos?</h2>
      <p className="text-white/50 mb-6 text-sm">Selecione todos que se aplicam</p>
      <div className="grid grid-cols-2 gap-3">
        {EXPENSES.map((e) => {
          const selected = form.mainExpenses.includes(e.id);
          return (
            <motion.button
              key={e.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleExpense(e.id)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200",
                selected ? "border-emerald-400 bg-emerald-400/10" : "border-white/10 bg-white/5 hover:border-white/20"
              )}
            >
              {selected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-black" />
                </div>
              )}
              <e.icon className={cn("w-6 h-6", selected ? "text-emerald-400" : "text-white/50")} />
              <span className="text-xs font-medium text-center leading-tight">{e.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>,

    // Step 4 — Team
    <div key="team">
      <h2 className="text-2xl font-bold mb-2">Você tem equipe ou funcionários?</h2>
      <p className="text-white/50 mb-6 text-sm">Isso ativa funcionalidades de gestão de time</p>
      <div className="space-y-3">
        <OptionCard selected={form.hasTeam} onClick={() => setForm((f) => ({ ...f, hasTeam: true }))}>
          <div className="flex items-center gap-4">
            <Users className="w-6 h-6 text-blue-400" />
            <div>
              <p className="font-semibold text-sm">Sim, tenho equipe</p>
              <p className="text-xs text-white/50 mt-0.5">Ativar controle de equipe, salários e permissões</p>
            </div>
          </div>
        </OptionCard>
        <OptionCard selected={!form.hasTeam} onClick={() => setForm((f) => ({ ...f, hasTeam: false }))}>
          <div className="flex items-center gap-4">
            <User className="w-6 h-6 text-purple-400" />
            <div>
              <p className="font-semibold text-sm">Não, trabalho sozinho</p>
              <p className="text-xs text-white/50 mt-0.5">Foco em finanças pessoais e individuais</p>
            </div>
          </div>
        </OptionCard>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 p-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5"
      >
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-400">Tudo pronto!</p>
            <p className="text-xs text-white/50 mt-1">
              Com base nas suas respostas, vamos personalizar seu dashboard com as métricas mais relevantes para você.
            </p>
          </div>
        </div>
      </motion.div>
    </div>,
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-lg">FinanceOS</span>
        </div>

        <ProgressBar step={step} />

        <div className="text-xs text-white/30 mb-6">
          Passo {step + 1} de {TOTAL_STEPS}
        </div>

        {/* Step content */}
        <div className="relative overflow-hidden min-h-[420px]">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="text-white"
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={() => go(-1)}
            disabled={step === 0}
            className="text-white/50 hover:text-white gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          {step < TOTAL_STEPS - 1 ? (
            <Button
              onClick={() => go(1)}
              disabled={!canNext()}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
            >
              Continuar
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2 min-w-[140px]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Abrir Dashboard
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
