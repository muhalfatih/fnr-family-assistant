"use client";

import React from "react";
import { formatRupiah } from "@/lib/utils";
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Saldo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Saldo Kas
          </CardTitle>
          <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">
            {formatRupiah(totalBalance)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gabungan seluruh rekening aktif
          </p>
        </CardContent>
      </Card>

      {/* 2. Pemasukan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pemasukan Bulan Ini
          </CardTitle>
          <TrendingUp className="size-4 text-emerald-600" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums">
            {formatRupiah(monthlyIncome)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total pendapatan keluarga
          </p>
        </CardContent>
      </Card>

      {/* 3. Pengeluaran */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pengeluaran Bulan Ini
          </CardTitle>
          <TrendingDown className="size-4 text-destructive" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">
            {formatRupiah(monthlyExpense)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {budgetUsagePercent}% dari target anggaran
          </p>
        </CardContent>
      </Card>

      {/* 4. Sisa Anggaran */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Sisa Anggaran
          </CardTitle>
          <Target className="size-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">
            {formatRupiah(remainingBudget)}
          </div>
          <div className="mt-2.5">
            <Progress
              value={Math.min(100, budgetUsagePercent)}
              className="h-2"
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
