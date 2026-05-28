"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  PiggyBank, CreditCard, TrendingUp, Target, LineChart,
  User, Briefcase, Building2, Building, Sparkles, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Profile = {
  profileType: string;
  mainGoal: string;
  monthlyRevenue: string;
  mainExpenses: string[];
  hasTeam: boolean;
};

const PROFILE_LABELS: Record<string, { label: string; icon: typeof User; color: string }> = {
  PERSONAL: { label: "Pessoal", icon: User, color: "text-blue-400" },
  FREELANCER: { label: "Freelancer", icon: Briefcase, color: "text-purple-400" },
  SMALL_BUSINESS: { label: "Pequena Empresa", icon: Building2, color: "text-emerald-400" },
  ENTERPRISE: { label: "Corporativo", icon: Building, color: "text-orange-400" },
};

const GOAL_LABELS: Record<string, { label: string; icon: typeof PiggyBank; tip: string }> = {
  SAVE_MONEY: { label: "Economizar dinheiro", icon: PiggyBank, tip: "Tente poupar pelo menos 20% da sua renda mensal." },
  CONTROL_SPENDING: { label: "Controlar gastos", icon: CreditCard, tip: "Categorize todas as transações para ter controle total." },
  GROW_BUSINESS: { label: "Crescer negócio", icon: TrendingUp, tip: "Acompanhe o fluxo de caixa semanalmente." },
  PAY_DEBT: { label: "Quitar dívidas", icon: Target, tip: "Liste suas dívidas e use a estratégia bola de neve." },
  INVEST: { label: "Investir melhor", icon: LineChart, tip: "Reserve um percentual fixo para investimentos todo mês." },
};

const REVENUE_LABELS: Record<string, string> = {
  UNDER_2K: "até R$ 2.000/mês",
  FROM_2K_TO_5K: "R$ 2.000–5.000/mês",
  FROM_5K_TO_15K: "R$ 5.000–15.000/mês",
  FROM_15K_TO_50K: "R$ 15.000–50.000/mês",
  OVER_50K: "acima de R$ 50.000/mês",
};

export function WelcomeBanner() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const key = "welcome_dismissed";
    if (sessionStorage.getItem(key)) { setDismissed(true); return; }

    fetch("/api/onboarding/profile")
      .then((r) => r.json())
      .then((data) => { setProfile(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("welcome_dismissed", "1");
    setDismissed(true);
  };

  if (!loaded || dismissed || !profile) return null;

  const profileInfo = PROFILE_LABELS[profile.profileType];
  const goalInfo = GOAL_LABELS[profile.mainGoal];
  const ProfileIcon = profileInfo?.icon ?? User;
  const GoalIcon = goalInfo?.icon ?? Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mx-6 mt-6 p-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 relative"
    >
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex items-start gap-4 pr-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-white">Dashboard personalizado para você</span>
            <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/8 font-medium", profileInfo?.color)}>
              <ProfileIcon className="w-3 h-3" />
              {profileInfo?.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {goalInfo && (
              <div className="flex items-center gap-1.5">
                <GoalIcon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-white/60">
                  Objetivo: <span className="text-white/80 font-medium">{goalInfo.label}</span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/60">
                Renda: <span className="text-white/80 font-medium">{REVENUE_LABELS[profile.monthlyRevenue]}</span>
              </span>
            </div>
          </div>

          {goalInfo && (
            <p className="text-xs text-emerald-400/80 mt-2">
              💡 {goalInfo.tip}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
