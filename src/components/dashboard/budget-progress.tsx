"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils";

export interface CategoryBudgetItem {
  id: string;
  name: string;
  spent: number;
  target: number;
  icon?: string;
  color?: string;
}

interface BudgetProgressProps {
  budgets: CategoryBudgetItem[];
}

export function BudgetProgress({ budgets }: BudgetProgressProps) {
  return (
    <Card className="border-slate-200/80 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">
            🎯 Pemakaian Anggaran Bulanan
          </CardTitle>
          <span className="text-xs text-slate-400">Target vs Realisasi</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            Belum ada rencana anggaran bulan ini.
          </p>
        ) : (
          budgets.map((b) => {
            const percent = b.target > 0 ? Math.round((b.spent / b.target) * 100) : 0;
            const isOver = percent > 100;
            const isWarning = percent >= 80 && percent <= 100;

            return (
              <div key={b.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{b.name}</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-medium text-slate-900">{formatRupiah(b.spent)}</span>
                    <span className="text-slate-400">/ {formatRupiah(b.target)}</span>
                    <span
                      className={`ml-1 font-bold ${
                        isOver ? "text-rose-600" : isWarning ? "text-amber-600" : "text-emerald-600"
                      }`}
                    >
                      ({percent}%)
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOver ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
