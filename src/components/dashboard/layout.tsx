"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { QuickAddFab } from "@/components/dashboard/quick-add-fab";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { notifyDataChanged } from "@/lib/events";
import {
  BarChart3, Bot, Building2, CreditCard,
  LayoutDashboard, LogOut, Menu, Moon, Plus,
  Settings, Sun, TrendingUp, User, Wallet, X, Zap, BookOpen, Tag,
  HeartPulse, PiggyBank, Repeat, Trophy, ListTodo, type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, getInitials } from "@/lib/utils";

type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type NavItem = { href: string; icon: LucideIcon; label: string; badge?: string };
type NavSection = { section: string; business?: boolean; items: NavItem[] };

const NAV_ITEMS: NavSection[] = [
  {
    section: "Geral",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    section: "Dia a dia",
    items: [
      { href: "/tasks", icon: ListTodo, label: "Tarefas & Rotinas" },
      { href: "/transactions", icon: CreditCard, label: "Transações" },
      { href: "/cashflow", icon: Zap, label: "Contas a pagar/receber" },
      { href: "/recurring", icon: Repeat, label: "Recorrentes" },
    ],
  },
  {
    section: "Planejamento",
    items: [
      { href: "/budgets", icon: PiggyBank, label: "Orçamentos" },
      { href: "/goals", icon: TrendingUp, label: "Metas" },
      { href: "/achievements", icon: Trophy, label: "Conquistas" },
    ],
  },
  {
    section: "Análise",
    items: [
      { href: "/health", icon: HeartPulse, label: "Saúde Financeira" },
      { href: "/reports", icon: BarChart3, label: "Relatórios" },
      { href: "/ai", icon: Bot, label: "IA Financeira", badge: "Pro" },
    ],
  },
  {
    section: "Empresarial",
    business: true,
    items: [
      { href: "/companies", icon: Building2, label: "Empresas" },
      { href: "/team", icon: User, label: "Equipe" },
    ],
  },
  {
    section: "Ajustes",
    items: [
      { href: "/categories", icon: Tag, label: "Categorias" },
      { href: "/settings", icon: Settings, label: "Configurações" },
    ],
  },
];

function Sidebar({ user, onClose, businessMode = true }: { user: SessionUser; onClose?: () => void; businessMode?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const sections = NAV_ITEMS.filter((s) => !("business" in s && s.business) || businessMode);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base">FinanceOS</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-sidebar-accent">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => (
          <div key={section.section}>
            <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2 px-2">
              {section.section}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label, badge }) => {
                const active = pathname === href;
                return (
                  <Link key={href} href={href} onClick={onClose}
                    className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group",
                      active ? "bg-emerald-500/15 text-emerald-400 font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}>
                    <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-emerald-400" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground")} />
                    <span className="flex-1">{label}</span>
                    {badge && <Badge variant="purple" className="text-[9px] px-1.5 py-0.5">{badge}</Badge>}
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <Button variant="premium" className="w-full gap-2" size="sm" asChild>
          <Link href="/transactions/new">
            <Plus className="w-4 h-4" />
            Nova Transação
          </Link>
        </Button>
      </div>

      <div className="border-t border-sidebar-border px-3 py-3">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent cursor-pointer group w-full text-left"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback className="text-xs bg-emerald-500/15 text-emerald-400">
              {getInitials(user.name ?? user.email ?? "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user.name ?? "Usuário"}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.email}</p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors" />
        </button>
      </div>
    </div>
  );
}

function TopBar({ onMenuClick, user, onTutorial }: { onMenuClick: () => void; user: SessionUser; onTutorial?: () => void }) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const getPageTitle = () => {
    const map: Record<string, string> = {
      "/dashboard": "Dashboard",
      "/transactions": "Transações",
      "/transactions/new": "Nova Transação",
      "/transactions/import": "Importar Extrato",
      "/recurring": "Recorrentes",
      "/categories": "Categorias",
      "/budgets": "Orçamentos",
      "/goals": "Metas",
      "/achievements": "Conquistas",
      "/health": "Saúde Financeira",
      "/reports": "Relatórios",
      "/ai": "IA Financeira",
      "/companies": "Empresas",
      "/cashflow": "Contas a pagar/receber",
      "/team": "Equipe",
      "/settings": "Configurações",
    };
    return map[pathname] ?? "FinanceOS";
  };

  return (
    <div className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center gap-4 px-4 sm:px-6 sticky top-0 z-40">
      <button className="lg:hidden p-2 rounded-lg hover:bg-accent" onClick={onMenuClick}>
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1">
        <h1 className="text-sm font-semibold">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-9 h-9 rounded-lg border border-border hover:bg-accent flex items-center justify-center transition-colors"
        >
          <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        <button
          onClick={onTutorial}
          title="Ver tutorial"
          className="w-9 h-9 rounded-lg border border-border hover:bg-accent flex items-center justify-center transition-colors"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        <NotificationBell />

        <Button variant="premium" size="sm" asChild>
          <Link href="/transactions/new">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nova transação</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function DashboardLayout({ children, user, showTutorial = false, businessMode = true }: { children: React.ReactNode; user: SessionUser; showTutorial?: boolean; businessMode?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(showTutorial);

  // Lazily materialize due recurring transactions once per session
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("recurring_ran")) return;
    sessionStorage.setItem("recurring_ran", "1");
    fetch("/api/recurring/run", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { if (d?.created > 0) notifyDataChanged(); })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden lg:flex w-64 flex-col border-r border-sidebar-border bg-sidebar flex-shrink-0">
        <Sidebar user={user} businessMode={businessMode} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border z-50 lg:hidden flex flex-col"
              initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}>
              <Sidebar user={user} onClose={() => setMobileOpen(false)} businessMode={businessMode} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen(true)} user={user} onTutorial={() => setTutorialOpen(true)}  />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {tutorialOpen && <TutorialOverlay onClose={() => setTutorialOpen(false)} />}
      <QuickAddFab />
    </div>
  );
}
