"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowRight, Bot, BrainCircuit, CheckCircle2,
  Lightbulb, LineChart, MessageSquare, Send, Sparkles, TrendingDown,
  TrendingUp, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { mockInsights } from "@/lib/mock-data";

const QUICK_QUESTIONS = [
  "Como posso economizar mais este mês?",
  "Qual categoria gasto mais desnecessariamente?",
  "Quando vou atingir minha reserva de emergência?",
  "Quais assinaturas posso cancelar?",
];

const AI_PREDICTIONS = [
  {
    title: "Previsão de saldo em 3 meses",
    value: 71250,
    trend: "up",
    description: "Baseado nos seus hábitos atuais de economia",
    confidence: 87,
  },
  {
    title: "Gastos estimados em fevereiro",
    value: 5820,
    trend: "up",
    description: "Ligeiro aumento projetado em alimentação",
    confidence: 72,
  },
  {
    title: "Meta de emergência atingida em",
    value: 0,
    label: "Ago 2024",
    trend: "neutral",
    description: "Com o ritmo atual de economia",
    confidence: 91,
  },
];

const HABITS = [
  { label: "Restaurantes e delivery", amount: 631.40, avg: 450, trend: "up", pct: 40 },
  { label: "Assinaturas digitais", amount: 61.80, avg: 80, trend: "down", pct: -23 },
  { label: "Transporte", amount: 220, avg: 180, trend: "up", pct: 22 },
  { label: "Saúde e farmácia", amount: 449.90, avg: 350, trend: "up", pct: 29 },
];

export default function AIPage() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Array<{ role: "user" | "ai"; content: string }>>([
    {
      role: "ai",
      content: "Olá! Sou sua IA financeira. Analisei suas finanças e tenho insights importantes para você. Pode me perguntar qualquer coisa sobre seus gastos, metas ou previsões financeiras.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text?: string) => {
    const msg = text || message;
    if (!msg.trim()) return;

    setChat((prev) => [...prev, { role: "user", content: msg }]);
    setMessage("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 1200));

    const responses: Record<string, string> = {
      "Como posso economizar mais este mês?": "Analisando seus padrões, identifiquei 3 oportunidades: 1) Seus gastos com delivery subiram 40% — reduzir para 2x/semana economizaria R$ 180/mês. 2) Você tem 6 assinaturas ativas, R$ 61/mês. Revisar pode liberar R$ 20-30. 3) Transporte acima da média — considere otimizar rotas.",
      default: "Com base na análise dos seus dados financeiros, vejo que você tem bons hábitos de economia. Seu saldo cresceu 12,4% este mês e você está no caminho certo para atingir suas metas. Continue assim!",
    };

    setChat((prev) => [...prev, {
      role: "ai",
      content: responses[msg] || responses.default,
    }]);
    setLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">IA Financeira</h2>
            <p className="text-sm text-muted-foreground">Powered by machine learning</p>
          </div>
        </div>
        <Badge variant="purple" className="gap-1.5 self-start sm:self-auto">
          <Sparkles className="w-3 h-3" />
          Plano Pro
        </Badge>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="xl:col-span-2 rounded-xl border border-border bg-card overflow-hidden flex flex-col" style={{ height: "520px" }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/20">
            <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">FinanceAI</p>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online · Analisando seus dados
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chat.map((msg, i) => (
              <motion.div
                key={i}
                className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {msg.role === "ai" && (
                  <div className="w-7 h-7 rounded-full bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "ai"
                    ? "bg-muted text-foreground rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-tr-sm"
                )}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>

          {/* Quick questions */}
          <div className="px-5 py-3 border-t border-border/50">
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-violet-500/50 hover:bg-violet-500/5 hover:text-violet-400 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Pergunte sobre suas finanças..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1"
              />
              <Button variant="purple" size="sm" onClick={() => sendMessage()} disabled={!message.trim() || loading}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Insights panel */}
        <div className="space-y-5">
          {/* Predictions */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <LineChart className="w-4 h-4 text-violet-400" />
              <h3 className="font-semibold text-sm">Previsões</h3>
            </div>
            <div className="space-y-4">
              {AI_PREDICTIONS.map((p) => (
                <div key={p.title} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{p.title}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold">
                      {p.label || formatCurrency(p.value)}
                    </p>
                    <div className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      p.trend === "up" ? "text-emerald-400" : p.trend === "down" ? "text-red-400" : "text-muted-foreground"
                    )}>
                      {p.trend === "up" ? <TrendingUp className="w-3 h-3" /> : p.trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
                      {p.confidence}% conf.
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Habit analysis */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-yellow-400" />
              <h3 className="font-semibold text-sm">Análise de Hábitos</h3>
            </div>
            <div className="space-y-3">
              {HABITS.map((h) => (
                <div key={h.label} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{h.label}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(h.amount)}</p>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-semibold flex-shrink-0",
                    h.trend === "up" ? "text-red-400" : "text-emerald-400"
                  )}>
                    {h.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {h.pct > 0 ? "+" : ""}{h.pct}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto insights */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <h3 className="font-semibold text-sm">Alertas Ativos</h3>
            </div>
            <div className="space-y-3">
              {mockInsights.map((ins) => {
                const icons = { warning: AlertTriangle, success: CheckCircle2, info: Lightbulb, alert: AlertTriangle };
                const colors = { warning: "text-yellow-400", success: "text-emerald-400", info: "text-blue-400", alert: "text-red-400" };
                const Icon = icons[ins.type as keyof typeof icons];
                return (
                  <div key={ins.id} className="flex items-start gap-2">
                    <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", colors[ins.type as keyof typeof colors])} />
                    <div>
                      <p className="text-xs font-medium">{ins.title}</p>
                      <p className="text-xs text-muted-foreground">{ins.description.slice(0, 60)}...</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
