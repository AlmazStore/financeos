"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Circle, Clock, Flag, ListTodo, Plus,
  RefreshCw, Trash2, ChevronDown, Repeat, X,
  AlertTriangle, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type RoutineFrequency = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

type Task = {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
};

type Routine = {
  id: string;
  title: string;
  description?: string;
  frequency: RoutineFrequency;
  isActive: boolean;
  lastDoneAt?: string;
  nextDueAt?: string;
  createdAt: string;
};

const PRIORITY_LABEL: Record<TaskPriority, string> = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", URGENT: "Urgente" };
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: "text-slate-400",
  MEDIUM: "text-blue-400",
  HIGH: "text-yellow-400",
  URGENT: "text-red-400",
};
const FREQ_LABEL: Record<RoutineFrequency, string> = { DAILY: "Diária", WEEKLY: "Semanal", BIWEEKLY: "Quinzenal", MONTHLY: "Mensal" };

function formatDate(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function isOverdue(dueDate?: string) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"tasks" | "routines">("tasks");
  const [filter, setFilter] = useState<"pending" | "completed" | "all">("pending");

  // new task form
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("MEDIUM");
  const [newDueDate, setNewDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  // new routine form
  const [showNewRoutine, setShowNewRoutine] = useState(false);
  const [rTitle, setRTitle] = useState("");
  const [rFreq, setRFreq] = useState<RoutineFrequency>("DAILY");
  const [rSaving, setRSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [tr, rr] = await Promise.all([
      fetch("/api/tasks").then((r) => r.json()).catch(() => ({ tasks: [] })),
      fetch("/api/routines").then((r) => r.json()).catch(() => ({ routines: [] })),
    ]);
    setTasks(tr.tasks ?? []);
    setRoutines(rr.routines ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createTask() {
    if (!newTitle.trim()) return;
    setSaving(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), priority: newPriority, dueDate: newDueDate || undefined }),
    });
    setNewTitle(""); setNewPriority("MEDIUM"); setNewDueDate(""); setShowNewTask(false);
    setSaving(false);
    load();
  }

  async function toggleTask(task: Task) {
    const next: TaskStatus = task.status === "COMPLETED" ? "PENDING" : "COMPLETED";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    load();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    load();
  }

  async function createRoutine() {
    if (!rTitle.trim()) return;
    setRSaving(true);
    await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: rTitle.trim(), frequency: rFreq }),
    });
    setRTitle(""); setRFreq("DAILY"); setShowNewRoutine(false);
    setRSaving(false);
    load();
  }

  async function markRoutineDone(id: string) {
    await fetch(`/api/routines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markDone: true }),
    });
    load();
  }

  async function deleteRoutine(id: string) {
    await fetch(`/api/routines/${id}`, { method: "DELETE" });
    load();
  }

  const filteredTasks = tasks.filter((t) => {
    if (filter === "pending") return t.status === "PENDING" || t.status === "IN_PROGRESS";
    if (filter === "completed") return t.status === "COMPLETED";
    return true;
  });

  const todayTasks = tasks.filter((t) => (t.status === "PENDING" || t.status === "IN_PROGRESS") && t.dueDate && !isOverdue(t.dueDate) && new Date(t.dueDate).toDateString() === new Date().toDateString());
  const overdueTasks = tasks.filter((t) => (t.status === "PENDING" || t.status === "IN_PROGRESS") && isOverdue(t.dueDate));
  const pendingCount = tasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS").length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[900px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <ListTodo className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Tarefas & Rotinas</h2>
            <p className="text-sm text-muted-foreground">{pendingCount} tarefas pendentes · {routines.filter((r) => r.isActive).length} rotinas ativas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          {tab === "tasks" ? (
            <Button size="sm" onClick={() => setShowNewTask(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Nova Tarefa
            </Button>
          ) : (
            <Button size="sm" onClick={() => setShowNewRoutine(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Nova Rotina
            </Button>
          )}
        </div>
      </div>

      {/* Today summary */}
      {(todayTasks.length > 0 || overdueTasks.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {overdueTasks.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-400">{overdueTasks.length} tarefa(s) atrasada(s)</p>
                <p className="text-xs text-muted-foreground mt-0.5">{overdueTasks.slice(0, 2).map((t) => t.title).join(", ")}{overdueTasks.length > 2 ? "..." : ""}</p>
              </div>
            </div>
          )}
          {todayTasks.length > 0 && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
              <Calendar className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-400">{todayTasks.length} tarefa(s) para hoje</p>
                <p className="text-xs text-muted-foreground mt-0.5">{todayTasks.slice(0, 2).map((t) => t.title).join(", ")}{todayTasks.length > 2 ? "..." : ""}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
        {(["tasks", "routines"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
            tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}>
            {t === "tasks" ? "Tarefas" : "Rotinas"}
          </button>
        ))}
      </div>

      {/* Task new form */}
      <AnimatePresence>
        {showNewTask && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Nova Tarefa</p>
              <button onClick={() => setShowNewTask(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <Input placeholder="Título da tarefa" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createTask()} autoFocus />
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1">
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((p) => (
                  <button key={p} onClick={() => setNewPriority(p)} className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-all",
                    newPriority === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border/80"
                  )}>{PRIORITY_LABEL[p]}</button>
                ))}
              </div>
              <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-auto text-xs" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNewTask(false)}>Cancelar</Button>
              <Button size="sm" onClick={createTask} disabled={!newTitle.trim() || saving}>Criar Tarefa</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Routine new form */}
      <AnimatePresence>
        {showNewRoutine && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Nova Rotina</p>
              <button onClick={() => setShowNewRoutine(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <Input placeholder="Nome da rotina" value={rTitle} onChange={(e) => setRTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createRoutine()} autoFocus />
            <div className="flex gap-1 flex-wrap">
              {(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"] as RoutineFrequency[]).map((f) => (
                <button key={f} onClick={() => setRFreq(f)} className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-all",
                  rFreq === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border/80"
                )}>{FREQ_LABEL[f]}</button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowNewRoutine(false)}>Cancelar</Button>
              <Button size="sm" onClick={createRoutine} disabled={!rTitle.trim() || rSaving}>Criar Rotina</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks list */}
      {tab === "tasks" && (
        <div className="space-y-3">
          {/* Filter */}
          <div className="flex gap-1">
            {(["pending", "completed", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn(
                "text-xs px-3 py-1 rounded-full border transition-all",
                filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              )}>
                {f === "pending" ? "Pendentes" : f === "completed" ? "Concluídas" : "Todas"}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse h-16" />
            ))}</div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <ListTodo className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma tarefa aqui.</p>
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => setShowNewTask(true)}>
                <Plus className="w-3.5 h-3.5" /> Criar tarefa
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredTasks.map((task) => (
                  <motion.div key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 group",
                      task.status === "COMPLETED" && "opacity-60"
                    )}>
                    <button onClick={() => toggleTask(task)} className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors">
                      {task.status === "COMPLETED"
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        : <Circle className="w-5 h-5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", task.status === "COMPLETED" && "line-through text-muted-foreground")}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-xs flex items-center gap-1", PRIORITY_COLOR[task.priority])}>
                          <Flag className="w-3 h-3" />{PRIORITY_LABEL[task.priority]}
                        </span>
                        {task.dueDate && (
                          <span className={cn("text-xs flex items-center gap-1", isOverdue(task.dueDate) && task.status !== "COMPLETED" ? "text-red-400" : "text-muted-foreground")}>
                            <Clock className="w-3 h-3" />{formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Routines list */}
      {tab === "routines" && (
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse h-16" />
            ))}</div>
          ) : routines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Repeat className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma rotina criada ainda.</p>
              <Button size="sm" className="mt-3 gap-1.5" onClick={() => setShowNewRoutine(true)}>
                <Plus className="w-3.5 h-3.5" /> Criar rotina
              </Button>
            </div>
          ) : (
            <AnimatePresence>
              {routines.map((routine) => (
                <motion.div key={routine.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className={cn("rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 group", !routine.isActive && "opacity-50")}>
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                    <Repeat className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{routine.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">{FREQ_LABEL[routine.frequency]}</Badge>
                      {routine.nextDueAt && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />Próxima: {formatDate(routine.nextDueAt)}
                        </span>
                      )}
                      {routine.lastDoneAt && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />Feita: {formatDate(routine.lastDoneAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => markRoutineDone(routine.id)}>
                      <CheckCircle2 className="w-3 h-3" /> Feita
                    </Button>
                    <button onClick={() => deleteRoutine(routine.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
