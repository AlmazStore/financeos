"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle, Bot, BrainCircuit, CheckCircle2,
  Lightbulb, LineChart, Send, Sparkles, TrendingDown,
  TrendingUp, Zap, Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { useAutoRefresh, notifyDataChanged } from "@/lib/events";

const QUICK_QUESTIONS = [
  "Onde eu mais gasto?",
  "Registra um gasto de R$50 no mercado hoje",
  "Cria uma meta de R$5.000 para viagem",
  "Define um orçamento de R$800 em alimentação",
];

type Insight = { id: string; type: "warning" | "success" | "info" | "alert"; title: string; description: string };
type Prediction = { title: string; value: number; label?: string; trend: "up" | "down" | "neutral"; description: string; confidence: number };
type Habit = { label: string; amount: number; avg: number; trend: "up" | "down"; pct: number };

type Analysis = {
  hasData: boolean;
  insights: Insight[];
  predictions: Prediction[];
  habits: Habit[];
};

export default function AIPage() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Array<{ role: "user" | "ai"; content: string }>>([
    {
      role: "ai",
      content: "Olá! Sou sua IA financeira. Além de analisar seus dados reais, eu executo tarefas pra você: registrar transações, criar metas, definir orçamentos e recorrentes. É só pedir — ex: \"registra um gasto de R$50 no mercado\" ou \"cria uma meta de R$5.000 pra viagem\".",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadInsights = useCallback(() => {
    fetch("/api/ai/insights")
      .then((r) => r.json())
      .then((d) => setAnalysis(d))
      .catch(() => {});
  }, []);

  useEffect(() => { loadInsights(); }, [loadInsights]);
  useAutoRefresh(loadInsights);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  const sendMessage = async (text?: string) => {
    const msg = text || message;
    if (!msg.trim()) return;

    // Build the conversation to send (history + the new user message)
    const outgoing = [...chat, { role: "user" as const, content: msg }];
    setChat(outgoing);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, messages: outgoing }),
      });
      const data = await res.json();
      setChat((prev) => [...prev, { role: "ai", content: data.answer ?? "Não consegui responder agora." }]);
      // If the assistant performed an action (created/updated data), refresh the app
      if (data.changed) { notifyDataChanged(); loadInsights(); }
    } catch {
      setChat((prev) => [...prev, { role: "ai", content: "Ops, tive um problema ao analisar. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  const noData = analysis && !analysis.hasData;

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
            <p className="text-sm text-muted-foreground">Análise dos seus dados reais</p>
          </div>
        </div>
        <Badge variant="purple" className="gap-1.5 self-start sm:self-auto">
          <Sparkles className="w-3 h-3" />
          Pro
        </Badge>
      </div>

      {noData && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 flex items-start gap-4">
          <Receipt className="w-6 h-6 text-violet-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Adicione transações para liberar a análise</p>
            <p className="text-sm text-muted-foreground mt-1">
              A IA precisa dos seus dados reais para gerar insights. Registre o extrato do seu mês e volte aqui.
            </p>
            <Button variant="purple" size="sm" className="mt-3" asChild>
              <Link href="/transactions/new">Adicionar transação</Link>
            </Button>
          </div>
        </div>
      )}

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
                  msg.role === "ai" ? "bg-muted text-foreground rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm"
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
            <div ref={chatEndRef} />
          </div>

          <div className="px-5 py-3 border-t border-border/50">
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_QUESTIONS.map((qq) => (
                <button
                  key={qq}
                  onClick={() => sendMessage(qq)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-violet-500/50 hover:bg-violet-500/5 hover:text-violet-400 transition-all disabled:opacity-50"
                >
                  {qq}
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
            {!analysis?.predictions?.length ? (
              <p className="text-xs text-muted-foreground">Sem dados suficientes ainda.</p>
            ) : (
              <div className="space-y-4">
                {analysis.predictions.map((p) => (
                  <div key={p.title} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{p.title}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-base font-bold">{p.label || formatCurrency(p.value)}</p>
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
            )}
          </div>

          {/* Habits */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-yellow-400" />
              <h3 className="font-semibold text-sm">Análise de Hábitos</h3>
            </div>
            {!analysis?.habits?.length ? (
              <p className="text-xs text-muted-foreground">Registre gastos para ver a evolução por categoria.</p>
            ) : (
              <div className="space-y-3">
                {analysis.habits.map((h) => (
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
            )}
          </div>

          {/* Active insights */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <h3 className="font-semibold text-sm">Alertas Ativos</h3>
            </div>
            {!analysis?.insights?.length ? (
              <p className="text-xs text-muted-foreground">Nenhum alerta no momento.</p>
            ) : (
              <div className="space-y-3">
                {analysis.insights.map((ins) => {
                  const icons = { warning: AlertTriangle, success: CheckCircle2, info: Lightbulb, alert: AlertTriangle };
                  const colors = { warning: "text-yellow-400", success: "text-emerald-400", info: "text-blue-400", alert: "text-red-400" };
                  const Icon = icons[ins.type];
                  return (
                    <div key={ins.id} className="flex items-start gap-2">
                      <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", colors[ins.type])} />
                      <div>
                        <p className="text-xs font-medium">{ins.title}</p>
                        <p className="text-xs text-muted-foreground">{ins.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
