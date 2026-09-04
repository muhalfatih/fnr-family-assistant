"use client";

import React from "react";
import { formatRupiah, formatCompactNumber } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet, TrendingUp, TrendingDown, Target } from "lucide-react";

interface SummaryCardsProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  totalBudget: number;
}

export function SummaryCards({
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  totalBudget,
}: SummaryCardsProps) {
  const remainingBudget = Math.max(0, totalBudget - monthlyExpense);
  const budgetUsagePercent = totalBudget > 0 ? Math.round((monthlyExpense / totalBudget) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
      {/* 1. Total Saldo */}
      <Card className="rounded-xl border border-border/70 bg-card/60 shadow-none hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-5 pb-1 sm:pb-0 gap-1.5">
          <CardTitle className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Total Saldo Kas
          </CardTitle>
          <Wallet className="size-3.5 sm:size-4 text-muted-foreground shrink-0" aria-hidden="true" />
        </CardHeader>
        <CardContent className="p-3 sm:p-5 pt-0 sm:pt-1 space-y-0.5 sm:space-y-1">
          <div
            className="text-xl sm:text-2xl lg:text-[32px] font-bold tracking-tight text-foreground truncate cursor-default leading-tight"
            title={formatRupiah(totalBalance)}
          >
            {formatCompactNumber(totalBalance)}
          </div>
          <p className="text-[10.5px] sm:text-xs text-muted-foreground truncate">
            Rekening aktif
          </p>
        </CardContent>
      </Card>

      {/* 2. Pemasukan */}
      <Card className="rounded-xl border border-border/70 bg-card/60 shadow-none hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-5 pb-1 sm:pb-0 gap-1.5">
          <CardTitle className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Pemasukan
          </CardTitle>
          <TrendingUp className="size-3.5 sm:size-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
        </CardHeader>
        <CardContent className="p-3 sm:p-5 pt-0 sm:pt-1 space-y-0.5 sm:space-y-1">
          <div
            className="text-xl sm:text-2xl lg:text-[32px] font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate cursor-default leading-tight"
            title={formatRupiah(monthlyIncome)}
          >
            {formatCompactNumber(monthlyIncome)}
          </div>
          <p className="text-[10.5px] sm:text-xs text-muted-foreground truncate">
            Pendapatan keluarga
          </p>
        </CardContent>
      </Card>

      {/* 3. Pengeluaran */}
      <Card className="rounded-xl border border-border/70 bg-card/60 shadow-none hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-5 pb-1 sm:pb-0 gap-1.5">
          <CardTitle className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Pengeluaran
          </CardTitle>
          <TrendingDown className="size-3.5 sm:size-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
        </CardHeader>
        <CardContent className="p-3 sm:p-5 pt-0 sm:pt-1 space-y-0.5 sm:space-y-1">
          <div
            className="text-xl sm:text-2xl lg:text-[32px] font-bold tracking-tight text-rose-600 dark:text-rose-400 truncate cursor-default leading-tight"
            title={formatRupiah(monthlyExpense)}
          >
            {formatCompactNumber(monthlyExpense)}
          </div>
          <p className="text-[10.5px] sm:text-xs text-muted-foreground truncate">
            {budgetUsagePercent}% pagu anggaran
          </p>
        </CardContent>
      </Card>

      {/* 4. Sisa Anggaran */}
      <Card className="rounded-xl border border-border/70 bg-card/60 shadow-none hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-5 pb-1 sm:pb-0 gap-1.5">
          <CardTitle className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
            Sisa Anggaran
          </CardTitle>
          <Target className="size-3.5 sm:size-4 text-amber-500 shrink-0" aria-hidden="true" />
        </CardHeader>
        <CardContent className="p-3 sm:p-5 pt-0 sm:pt-1 space-y-1.5">
          <div
            className="text-xl sm:text-2xl lg:text-[32px] font-bold tracking-tight text-foreground truncate cursor-default leading-tight"
            title={formatRupiah(remainingBudget)}
          >
            {formatCompactNumber(remainingBudget)}
          </div>
          <Progress
            value={Math.min(100, budgetUsagePercent)}
            className="h-1.5"
            indicatorClassName={
              budgetUsagePercent > 90
                ? "bg-rose-500"
                : budgetUsagePercent > 75
                ? "bg-amber-500"
                : "bg-emerald-600"
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
