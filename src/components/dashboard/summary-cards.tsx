"use client";

import React from "react";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Total Saldo Kas</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums truncate text-foreground">
              {formatRupiah(totalBalance)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Gabungan seluruh rekening aktif
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Pemasukan */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Pemasukan Bulan Ini</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums truncate text-emerald-600 dark:text-emerald-400">
              {formatRupiah(monthlyIncome)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Total pendapatan keluarga
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Pengeluaran */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Pengeluaran Bulan Ini</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums truncate text-destructive">
              {formatRupiah(monthlyExpense)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {budgetUsagePercent}% dari target anggaran
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <TrendingDown className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Sisa Anggaran */}
      <Card>
        <CardContent className="p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Sisa Anggaran</p>
              <p className="text-2xl font-bold tracking-tight tabular-nums truncate text-foreground">
                {formatRupiah(remainingBudget)}
              </p>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Target className="size-5" aria-hidden="true" />
            </div>
          </div>
          <div>
            <Progress
              value={Math.min(100, budgetUsagePercent)}
              className="h-1.5"
              indicatorClassName={
                budgetUsagePercent > 90
                  ? "bg-destructive"
                  : budgetUsagePercent > 75
                  ? "bg-amber-500"
                  : "bg-emerald-600"
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
