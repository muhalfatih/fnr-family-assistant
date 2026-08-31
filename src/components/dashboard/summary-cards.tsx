"use client";

import React from "react";
import { Wallet, TrendingUp, TrendingDown, Target, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils";

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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Saldo Kas */}
      <Card className="border-slate-200/80 bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Saldo Kas
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              {formatRupiah(totalBalance)}
            </h3>
            <p className="mt-1 text-xs text-slate-500">Gabungan seluruh rekening & e-wallet</p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Pemasukan Bulan Ini */}
      <Card className="border-slate-200/80 bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pemasukan Bulan Ini
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              {formatRupiah(monthlyIncome)}
            </h3>
            <div className="mt-1 flex items-center text-xs font-medium text-emerald-600">
              <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
              <span>Gaji & Pendapatan Lain</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Pengeluaran Bulan Ini */}
      <Card className="border-slate-200/80 bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pengeluaran Bulan Ini
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              {formatRupiah(monthlyExpense)}
            </h3>
            <div className="mt-1 flex items-center text-xs font-medium text-rose-600">
              <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
              <span>{budgetUsagePercent}% dari batas anggaran</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Sisa Budget */}
      <Card className="border-slate-200/80 bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sisa Budget Bulan Ini
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Target className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              {formatRupiah(remainingBudget)}
            </h3>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  budgetUsagePercent > 90
                    ? "bg-rose-500"
                    : budgetUsagePercent > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, budgetUsagePercent)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
