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
      <Card className="rounded-2xl border-slate-200/80 bg-white">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Saldo Kas
          </CardTitle>
          <div className="flex size-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
            <Wallet className="size-4" />
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-1">
          <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatRupiah(totalBalance)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Gabungan seluruh rekening</p>
        </CardContent>
      </Card>

      {/* 2. Pemasukan */}
      <Card className="rounded-2xl border-slate-200/80 bg-white">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pemasukan
          </CardTitle>
          <div className="flex size-8 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <TrendingUp className="size-4" />
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-1">
          <div className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">
            {formatRupiah(monthlyIncome)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Pendapatan bulan ini</p>
        </CardContent>
      </Card>

      {/* 3. Pengeluaran */}
      <Card className="rounded-2xl border-slate-200/80 bg-white">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pengeluaran
          </CardTitle>
          <div className="flex size-8 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
            <TrendingDown className="size-4" />
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-1">
          <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatRupiah(monthlyExpense)}
          </div>
          <p className="text-xs text-slate-500 mt-1">{budgetUsagePercent}% dari target anggaran</p>
        </CardContent>
      </Card>

      {/* 4. Sisa Anggaran */}
      <Card className="rounded-2xl border-slate-200/80 bg-white">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Sisa Anggaran
          </CardTitle>
          <div className="flex size-8 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
            <Target className="size-4" />
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-1">
          <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatRupiah(remainingBudget)}
          </div>
          <div className="mt-2.5">
            <Progress
              value={Math.min(100, budgetUsagePercent)}
              className="h-2 bg-slate-100 rounded-full"
              indicatorClassName={
                budgetUsagePercent > 90
                  ? "bg-rose-600 rounded-full"
                  : budgetUsagePercent > 75
                  ? "bg-amber-500 rounded-full"
                  : "bg-emerald-600 rounded-full"
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
