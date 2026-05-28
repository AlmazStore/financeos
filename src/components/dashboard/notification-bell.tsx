"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, Clock, CheckCircle2, Info, BellOff } from "lucide-react";
import { useAutoRefresh } from "@/lib/events";
import { cn } from "@/lib/utils";

type Notif = { id: string; type: "alert" | "reminder" | "info" | "success"; title: string; message: string };

const ICON = { alert: AlertTriangle, reminder: Clock, info: Info, success: CheckCircle2 };
const COLOR = { alert: "text-red-400", reminder: "text-yellow-400", info: "text-blue-400", success: "text-emerald-400" };
const READ_KEY = "notif_read";

function getRead(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); } catch { return new Set(); }
}

export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetch("/api/notifications").then((r) => r.json()).then((d) => setItems(d.notifications ?? [])).catch(() => {});
  }, []);

  useEffect(() => { setRead(getRead()); load(); }, [load]);
  useAutoRefresh(load);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = items.filter((n) => !read.has(n.id));

  const markAllRead = () => {
    const all = new Set([...read, ...items.map((i) => i.id)]);
    setRead(all);
    if (typeof window !== "undefined") localStorage.setItem(READ_KEY, JSON.stringify([...all]));
  };

  const openPanel = () => {
    setOpen((o) => !o);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openPanel}
        className="relative w-9 h-9 rounded-lg border border-border hover:bg-accent flex items-center justify-center transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-4 h-4" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Notificações</span>
              {items.length > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">Marcar como lidas</button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-10 text-center">
                  <BellOff className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Tudo em dia! 🎉</p>
                  <p className="text-xs text-muted-foreground">Sem alertas no momento.</p>
                </div>
              ) : (
                items.map((n) => {
                  const Icon = ICON[n.type];
                  const isRead = read.has(n.id);
                  return (
                    <div key={n.id} className={cn("flex items-start gap-3 px-4 py-3 border-b border-border/50", !isRead && "bg-primary/[0.03]")}>
                      <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", COLOR[n.type])} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                      </div>
                      {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
