"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Rocket, Receipt, Target, CalendarClock,
  ArrowRight, CheckCircle2, Circle, Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  hasTransactions: boolean;
  hasGoals: boolean;
};

export function GettingStarted({ hasTransactions, hasGoals }: Props) {
  const steps = [
    {
      done: hasTransactions,
      icon: Receipt,
      title: "Registre o extrato do mês",
      desc: "Importe o extrato do seu banco (a forma mais rápida) ou adicione cada entrada e saída manualmente.",
      href: "/transactions/import",
      cta: "Importar extrato",
      secondary: { href: "/transactions/new", label: "Adicionar manual" },
    },
    {
      done: hasGoals,
      icon: Target,
      title: "Defina suas metas",
      desc: "Crie objetivos como reserva de emergência, viagem ou quitar dívidas.",
      href: "/goals",
      cta: "Criar meta",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Vamos começar! 🚀</h2>
            <p className="text-sm text-muted-foreground">
              {completedCount}/{steps.length} passos concluídos
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Seu painel está zerado e pronto para refletir <strong>suas</strong> finanças reais.
          Siga os passos abaixo para começar a ter controle total do seu dinheiro.
        </p>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-2">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={cn(
              "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl border transition-all",
              step.done
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-border hover:border-border/80 hover:bg-muted/20"
            )}
          >
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {step.done ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground/40" />
                )}
              </div>

              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                step.done ? "bg-emerald-500/10" : "bg-muted"
              )}>
                <step.icon className={cn("w-5 h-5", step.done ? "text-emerald-400" : "text-muted-foreground")} />
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", step.done && "line-through text-muted-foreground")}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
            </div>

            {!step.done && (
              <div className="flex gap-2 flex-shrink-0 pl-9 sm:pl-0">
                <Button variant="premium" size="sm" className="gap-1.5 flex-1 sm:flex-initial" asChild>
                  <Link href={step.href}>
                    {step.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
                {step.secondary && (
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-initial" asChild>
                    <Link href={step.secondary.href}>{step.secondary.label}</Link>
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Tip */}
      <div className="mx-4 mb-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarClock className="w-3.5 h-3.5 text-blue-400" />
              <p className="text-sm font-semibold text-blue-400">A dica de ouro</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Reserve <strong>5 minutos a cada 3 dias</strong> para adicionar suas transações.
              Esse hábito simples vai te mostrar exatamente para onde seu dinheiro está indo —
              e onde dá pra <strong>economizar e investir</strong> daqui pra frente.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
