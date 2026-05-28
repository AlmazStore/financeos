"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  prefix?: string;
  suffix?: string;
  type?: "currency" | "number" | "percentage";
  variant?: "default" | "income" | "expense" | "neutral";
  icon?: React.ReactNode;
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  type = "currency",
  variant = "default",
  icon,
  delay = 0,
}: StatCardProps) {
  const positive = change !== undefined ? change >= 0 : true;

  const formatValue = () => {
    if (type === "currency") return formatCurrency(value);
    if (type === "percentage") return formatPercentage(value);
    return value.toLocaleString("pt-BR");
  };

  const colorMap = {
    default: { bg: "bg-muted/50", text: "text-foreground", icon: "bg-muted" },
    income: { bg: "bg-emerald-500/5", text: "text-emerald-400", icon: "bg-emerald-500/10" },
    expense: { bg: "bg-red-500/5", text: "text-red-400", icon: "bg-red-500/10" },
    neutral: { bg: "bg-violet-500/5", text: "text-violet-400", icon: "bg-violet-500/10" },
  };

  const colors = colorMap[variant];

  return (
    <motion.div
      className={cn(
        "rounded-xl border border-border p-5 hover:shadow-md transition-all duration-300",
        colors.bg
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && (
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", colors.icon)}>
            {icon}
          </div>
        )}
      </div>

      <div className={cn("text-2xl font-bold mb-2", variant !== "default" ? colors.text : "")}>
        {formatValue()}
      </div>

      {change !== undefined && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", positive ? "text-emerald-400" : "text-red-400")}>
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{positive ? "+" : ""}{formatPercentage(Math.abs(change))} vs. mês anterior</span>
        </div>
      )}
    </motion.div>
  );
}
