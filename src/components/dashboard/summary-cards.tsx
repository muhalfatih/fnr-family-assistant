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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Saldo */}
      <Card className="rounded-xl border border-border/70 bg-card/60 shadow-none hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-5 pb-0">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Saldo Kas
          </CardTitle>
          <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-1 space-y-1">
          <div
            className="text-3xl lg:text-[34px] font-bold tracking-tight text-foreground truncate cursor-default leading-tight"
            title={formatRupiah(totalBalance)}
          >
            {formatCompactNumber(totalBalance)}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            Gabungan seluruh rekening aktif
          </p>
        </CardContent>
      </Card>

      {/* 2. Pemasukan */}
      <Card className="rounded-xl border border-border/70 bg-card/60 shadow-none hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-5 pb-0">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Pemasukan Bulan Ini
          </CardTitle>
          <TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-1 space-y-1">
          <div
            className="text-3xl lg:text-[34px] font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate cursor-default leading-tight"
            title={formatRupiah(monthlyIncome)}
          >
            {formatCompactNumber(monthlyIncome)}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            Total pendapatan keluarga
          </p>
        </CardContent>
      </Card>

      {/* 3. Pengeluaran */}
      <Card className="rounded-xl border border-border/70 bg-card/60 shadow-none hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-5 pb-0">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Pengeluaran Bulan Ini
          </CardTitle>
          <TrendingDown className="size-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-1 space-y-1">
          <div
            className="text-3xl lg:text-[34px] font-bold tracking-tight text-rose-600 dark:text-rose-400 truncate cursor-default leading-tight"
            title={formatRupiah(monthlyExpense)}
          >
            {formatCompactNumber(monthlyExpense)}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {budgetUsagePercent}% dari pagu anggaran
          </p>
        </CardContent>
      </Card>

      {/* 4. Sisa Anggaran */}
      <Card className="rounded-xl border border-border/70 bg-card/60 shadow-none hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-5 pb-0">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Sisa Anggaran
          </CardTitle>
          <Target className="size-4 text-amber-500" aria-hidden="true" />
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-1 space-y-1.5">
          <div
            className="text-3xl lg:text-[34px] font-bold tracking-tight text-foreground truncate cursor-default leading-tight"
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
