"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ArrowRight, ArrowLeft, LayoutDashboard, CreditCard,
  TrendingUp, BarChart3, Bot, Building2, Zap, Plus,
  Sparkles, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: LayoutDashboard,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    title: "Seu Dashboard Personalizado",
    desc: "Aqui você tem uma visão geral de todas as suas finanças. Os cards no topo mostram seu saldo, receitas e despesas do mês atual em tempo real.",
    tip: "Os dados se atualizam conforme você adiciona transações.",
  },
  {
    icon: Plus,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    title: "Adicionando Transações",
    desc: "Clique em \"Nova Transação\" no botão verde do menu lateral ou no topo da tela. Você pode registrar receitas, despesas e transferências.",
    tip: "Use categorias para organizar melhor seus gastos.",
  },
  {
    icon: CreditCard,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    title: "Gerenciar Transações",
    desc: "Na seção \"Transações\" você vê todo o histórico, filtra por mês, tipo ou categoria, e pode editar ou excluir qualquer lançamento.",
    tip: "Use os filtros de data para analisar períodos específicos.",
  },
  {
    icon: TrendingUp,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    title: "Definindo Metas",
    desc: "Em \"Metas\" você cria objetivos financeiros (viagem, reserva, quitação de dívida) e acompanha o progresso visualmente.",
    tip: "Defina um prazo para suas metas para manter o foco.",
  },
  {
    icon: BarChart3,
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    title: "Relatórios e Análises",
    desc: "\"Relatórios\" mostra gráficos detalhados de receitas vs despesas, distribuição por categoria e evolução ao longo do tempo.",
    tip: "Compare meses diferentes para identificar tendências.",
  },
  {
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    title: "Fluxo de Caixa",
    desc: "\"Fluxo de Caixa\" projeta sua situação financeira futura com base nos lançamentos recorrentes e pendentes.",
    tip: "Ideal para planejar pagamentos e evitar surpresas.",
  },
  {
    icon: Bot,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    title: "IA Financeira",
    desc: "O assistente de IA analisa seus dados e dá insights personalizados: onde cortar gastos, como atingir suas metas mais rápido e alertas de anomalias.",
    tip: "Quanto mais transações você registrar, mais precisas são as análises.",
  },
  {
    icon: Building2,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    title: "Gestão de Empresas",
    desc: "Em \"Empresas\" você pode gerenciar finanças de múltiplos negócios separadamente, com relatórios e transações independentes para cada um.",
    tip: "Convide membros da equipe com diferentes níveis de permissão.",
  },
];

type Props = {
  onClose: () => void;
};

export function TutorialOverlay({ onClose }: Props) {
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleClose = async () => {
    try {
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorialDone: true }),
      });
    } catch {}
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Tutorial Rápido</span>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 px-6 pb-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-6 bg-emerald-400" : i < step ? "w-3 bg-emerald-400/40" : "w-3 bg-white/10"
                )}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="px-6 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-5", current.bg)}>
                  <current.icon className={cn("w-7 h-7", current.color)} />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">{current.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed mb-4">{current.desc}</p>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/8">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-white/50">{current.tip}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-6 pb-6 pt-2 border-t border-white/8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="text-white/40 hover:text-white gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Anterior
            </Button>

            <span className="text-xs text-white/30">{step + 1} / {STEPS.length}</span>

            {isLast ? (
              <Button
                size="sm"
                onClick={handleClose}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Concluir
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                className="bg-white/10 hover:bg-white/15 text-white gap-1.5"
              >
                Próximo
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
