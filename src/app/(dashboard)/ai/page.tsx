"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Bot, BrainCircuit, CheckCircle2,
  Lightbulb, LineChart, Send, Sparkles, TrendingDown,
  TrendingUp, Zap, Receipt, ListTodo, Repeat, Clock,
  Flag, Circle, Sun, Mic, MicOff, Volume2, VolumeX, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { useAutoRefresh, notifyDataChanged } from "@/lib/events";

const QUICK_QUESTIONS = [
  "O que tenho pra hoje?",
  "Cria uma tarefa: ligar pro banco amanhã",
  "Onde eu mais gasto?",
  "Registra um gasto de R$50 no mercado hoje",
];

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Task = { id: string; title: string; priority: TaskPriority; status: string; dueDate?: string };
type Routine = { id: string; title: string; frequency: string; nextDueAt?: string };

const PRIORITY_COLOR: Record<TaskPriority, string> = { LOW: "text-slate-400", MEDIUM: "text-blue-400", HIGH: "text-yellow-400", URGENT: "text-red-400" };
const FREQ_LABEL: Record<string, string> = { DAILY: "Diária", WEEKLY: "Semanal", BIWEEKLY: "Quinzenal", MONTHLY: "Mensal" };

type Insight = { id: string; type: "warning" | "success" | "info" | "alert"; title: string; description: string };
type Prediction = { title: string; value: number; label?: string; trend: "up" | "down" | "neutral"; description: string; confidence: number };
type Habit = { label: string; amount: number; avg: number; trend: "up" | "down"; pct: number };

type Analysis = {
  hasData: boolean;
  insights: Insight[];
  predictions: Prediction[];
  habits: Habit[];
};

// Voice assistant states for the immersive overlay
type VoiceState = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

export default function AIPage() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<Array<{ role: "user" | "ai"; content: string }>>([
    {
      role: "ai",
      content: "Bom dia! Sou sua assistente pessoal. Posso ajudar com suas finanças, criar tarefas, montar rotinas e muito mais. Toque no microfone e fale comigo, ou pergunte \"o que tenho pra hoje?\".",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice mode
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceEnabled, setVoiceEnabled] = useState(true); // TTS on/off
  const [liveText, setLiveText] = useState(""); // last transcription / spoken text
  const [voiceError, setVoiceError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const voiceModeRef = useRef(false); // true while the voice overlay drives the conversation

  const loadInsights = useCallback(() => {
    fetch("/api/ai/insights")
      .then((r) => r.json())
      .then((d) => setAnalysis(d))
      .catch(() => {});
  }, []);

  const loadTasks = useCallback(() => {
    fetch("/api/tasks?today=true")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => {});
    fetch("/api/routines")
      .then((r) => r.json())
      .then((d) => setRoutines(d.routines ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { loadInsights(); loadTasks(); }, [loadInsights, loadTasks]);
  useAutoRefresh(() => { loadInsights(); loadTasks(); });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  // ---- Text-to-speech (browser SpeechSynthesis) ----
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    utter.rate = 1.02;
    utter.pitch = 1.0;
    // Prefer a Brazilian Portuguese voice if available
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find((v) => v.lang === "pt-BR") || voices.find((v) => v.lang.startsWith("pt"));
    if (ptVoice) utter.voice = ptVoice;
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utter);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  // ---- Core: send a message to the assistant ----
  // fromVoice = true makes the assistant speak the answer back and (optionally) re-listen
  const sendMessage = useCallback(async (text?: string, fromVoice = false) => {
    const msg = text || message;
    if (!msg.trim()) return;

    const outgoing = [...chat, { role: "user" as const, content: msg }];
    setChat(outgoing);
    setMessage("");
    setLoading(true);
    if (fromVoice) setVoiceState("thinking");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, messages: outgoing }),
      });
      const data = await res.json();
      const answer = data.answer ?? "Não consegui responder agora.";
      setChat((prev) => [...prev, { role: "ai", content: answer }]);
      if (data.changed) { notifyDataChanged(); loadInsights(); loadTasks(); }

      if (fromVoice && voiceEnabled) {
        setVoiceState("speaking");
        setLiveText(answer);
        speak(answer, () => { setVoiceState("idle"); });
      } else if (fromVoice) {
        setLiveText(answer);
        setVoiceState("idle");
      }
    } catch {
      const errMsg = "Ops, tive um problema ao processar. Tente novamente.";
      setChat((prev) => [...prev, { role: "ai", content: errMsg }]);
      if (fromVoice) { setVoiceState("idle"); setVoiceError(errMsg); }
    } finally {
      setLoading(false);
    }
  }, [message, chat, voiceEnabled, speak, loadInsights, loadTasks]);

  // ---- Recording -> transcription -> send ----
  const startRecording = useCallback(async () => {
    setVoiceError("");
    stopSpeaking();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        // Release the mic
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 1200) { setVoiceState("idle"); return; } // too short / silence

        setVoiceState("transcribing");
        try {
          const fd = new FormData();
          fd.append("audio", blob, "audio.webm");
          const res = await fetch("/api/ai/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          const text = (data.text ?? "").trim();
          if (!text) { setVoiceState("idle"); setVoiceError("Não entendi. Tente falar de novo."); return; }
          setLiveText(text);
          await sendMessage(text, true);
        } catch {
          setVoiceState("idle");
          setVoiceError("Falha ao transcrever o áudio.");
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setVoiceState("listening");
    } catch {
      setVoiceError("Não consegui acessar o microfone. Verifique as permissões do navegador.");
      setVoiceState("idle");
    }
  }, [sendMessage, stopSpeaking]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggleMic = useCallback(() => {
    if (voiceState === "listening") stopRecording();
    else if (voiceState === "idle") startRecording();
    else if (voiceState === "speaking") { stopSpeaking(); setVoiceState("idle"); }
  }, [voiceState, startRecording, stopRecording, stopSpeaking]);

  const openVoice = useCallback(() => {
    voiceModeRef.current = true;
    setVoiceOpen(true);
    setVoiceState("idle");
    setVoiceError("");
    setLiveText("");
  }, []);

  const closeVoice = useCallback(() => {
    voiceModeRef.current = false;
    stopRecording();
    stopSpeaking();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setVoiceOpen(false);
    setVoiceState("idle");
  }, [stopRecording, stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopSpeaking();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [stopSpeaking]);

  const noData = analysis && !analysis.hasData;
  const pendingTasks = tasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS");

  async function completeTaskQuick(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    loadTasks();
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Assistente Pessoal</h2>
            <p className="text-sm text-muted-foreground">Converse por voz ou texto</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="purple" size="sm" className="gap-1.5" onClick={openVoice}>
            <Mic className="w-4 h-4" />
            Falar
          </Button>
          <Badge variant="purple" className="gap-1.5">
            <Sparkles className="w-3 h-3" />
            Pro
          </Badge>
        </div>
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
            <div className="flex-1">
              <p className="text-sm font-semibold">FinanceAI</p>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online · Analisando seus dados
              </p>
            </div>
            <button
              onClick={() => setVoiceEnabled((v) => !v)}
              title={voiceEnabled ? "Voz ligada" : "Voz desligada"}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
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
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
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
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={openVoice} title="Falar com a assistente">
                <Mic className="w-4 h-4" />
              </Button>
              <Button variant="purple" size="sm" onClick={() => sendMessage()} disabled={!message.trim() || loading}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Morning Briefing */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sun className="w-4 h-4 text-yellow-400" />
              <h3 className="font-semibold text-sm">Briefing do Dia</h3>
              <Link href="/tasks" className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                Ver tudo →
              </Link>
            </div>
            {pendingTasks.length === 0 && routines.length === 0 ? (
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">Nenhuma tarefa para hoje.</p>
                <Button size="sm" variant="outline" className="mt-2 text-xs h-7 gap-1" asChild>
                  <Link href="/tasks"><ListTodo className="w-3 h-3" /> Criar tarefa</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      <ListTodo className="w-3 h-3" /> Tarefas ({pendingTasks.length})
                    </p>
                    <div className="space-y-1.5">
                      {pendingTasks.slice(0, 4).map((t) => (
                        <div key={t.id} className="flex items-center gap-2 group">
                          <button onClick={() => completeTaskQuick(t.id)} className="flex-shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors">
                            <Circle className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs flex-1 truncate">{t.title}</span>
                          <Flag className={cn("w-3 h-3 flex-shrink-0", PRIORITY_COLOR[t.priority as TaskPriority])} />
                        </div>
                      ))}
                      {pendingTasks.length > 4 && (
                        <p className="text-xs text-muted-foreground pl-5">+{pendingTasks.length - 4} mais</p>
                      )}
                    </div>
                  </div>
                )}
                {routines.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Repeat className="w-3 h-3" /> Rotinas ({routines.length})
                    </p>
                    <div className="space-y-1.5">
                      {routines.slice(0, 3).map((r) => (
                        <div key={r.id} className="flex items-center gap-2">
                          <Repeat className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                          <span className="text-xs flex-1 truncate">{r.title}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{FREQ_LABEL[r.frequency] ?? r.frequency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

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

      {/* ===== Immersive Voice Overlay ===== */}
      <AnimatePresence>
        {voiceOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Close + voice toggle */}
            <div className="absolute top-5 right-5 flex items-center gap-3">
              <button
                onClick={() => setVoiceEnabled((v) => !v)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title={voiceEnabled ? "Voz ligada" : "Voz desligada"}
              >
                {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button
                onClick={closeVoice}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Animated orb */}
            <div className="relative flex items-center justify-center mb-12" style={{ width: 280, height: 280 }}>
              {/* Outer pulse rings */}
              <AnimatePresence>
                {(voiceState === "listening" || voiceState === "speaking") && (
                  <>
                    {[0, 1, 2].map((ring) => (
                      <motion.div
                        key={ring}
                        className={cn(
                          "absolute rounded-full",
                          voiceState === "listening" ? "bg-violet-500/20" : "bg-emerald-500/20"
                        )}
                        style={{ width: 180, height: 180 }}
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 1.8, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, repeat: Infinity, delay: ring * 0.6, ease: "easeOut" }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>

              {/* Core orb */}
              <motion.div
                className={cn(
                  "relative rounded-full flex items-center justify-center shadow-2xl",
                  voiceState === "listening" && "bg-gradient-to-br from-violet-400 via-violet-600 to-fuchsia-600",
                  voiceState === "speaking" && "bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-600",
                  voiceState === "thinking" && "bg-gradient-to-br from-blue-400 via-indigo-600 to-violet-600",
                  voiceState === "transcribing" && "bg-gradient-to-br from-amber-400 via-orange-600 to-rose-600",
                  voiceState === "idle" && "bg-gradient-to-br from-violet-500 via-violet-700 to-fuchsia-700"
                )}
                style={{ width: 180, height: 180 }}
                animate={
                  voiceState === "listening"
                    ? { scale: [1, 1.08, 1] }
                    : voiceState === "speaking"
                    ? { scale: [1, 1.05, 0.98, 1.05, 1] }
                    : voiceState === "thinking" || voiceState === "transcribing"
                    ? { rotate: 360 }
                    : { scale: [1, 1.03, 1] }
                }
                transition={
                  voiceState === "thinking" || voiceState === "transcribing"
                    ? { duration: 3, repeat: Infinity, ease: "linear" }
                    : { duration: voiceState === "listening" ? 1.2 : 2, repeat: Infinity, ease: "easeInOut" }
                }
              >
                {voiceState === "thinking" || voiceState === "transcribing" ? (
                  <Loader2 className="w-14 h-14 text-white animate-spin" />
                ) : voiceState === "speaking" ? (
                  <Volume2 className="w-14 h-14 text-white" />
                ) : (
                  <Sparkles className="w-14 h-14 text-white" />
                )}
              </motion.div>
            </div>

            {/* Status text */}
            <div className="text-center px-6 max-w-md mb-10 min-h-[80px]">
              <p className="text-white/60 text-sm mb-2">
                {voiceState === "idle" && "Toque para falar"}
                {voiceState === "listening" && "Estou ouvindo..."}
                {voiceState === "transcribing" && "Entendendo o que você disse..."}
                {voiceState === "thinking" && "Pensando..."}
                {voiceState === "speaking" && "Respondendo..."}
              </p>
              {voiceError ? (
                <p className="text-red-400 text-sm">{voiceError}</p>
              ) : (
                liveText && (
                  <motion.p
                    key={liveText}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white text-lg font-medium leading-relaxed"
                  >
                    {liveText}
                  </motion.p>
                )
              )}
            </div>

            {/* Mic button */}
            <button
              onClick={toggleMic}
              disabled={voiceState === "transcribing" || voiceState === "thinking"}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl disabled:opacity-50",
                voiceState === "listening"
                  ? "bg-red-500 hover:bg-red-600 scale-110"
                  : voiceState === "speaking"
                  ? "bg-white/20 hover:bg-white/30"
                  : "bg-violet-600 hover:bg-violet-700"
              )}
            >
              {voiceState === "listening" ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : voiceState === "speaking" ? (
                <VolumeX className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </button>
            <p className="text-white/40 text-xs mt-4">
              {voiceState === "listening" ? "Toque para enviar" : voiceState === "speaking" ? "Toque para interromper" : "Toque no microfone e fale"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
