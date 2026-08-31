"use client";

import React from "react";
import { formatRupiah } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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
    <Card className="rounded-2xl border-slate-200/80 bg-white">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Alokasi Anggaran
        </CardTitle>
        <CardDescription className="text-xs text-slate-400">
          Realisasi belanja terhadap target bulanan
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-5 pt-2">
        {budgets.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3 text-center">
            Belum ada alokasi anggaran bulan ini.
          </p>
        ) : (
          budgets.map((b) => {
            const percent = b.target > 0 ? Math.round((b.spent / b.target) * 100) : 0;
            const isOver = percent > 100;
            const isWarning = percent >= 80 && percent <= 100;

            const indicatorColor = isOver
              ? "bg-rose-600 rounded-full"
              : isWarning
              ? "bg-amber-500 rounded-full"
              : "bg-emerald-600 rounded-full";

            return (
              <div key={b.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{b.name}</span>
                  <div className="flex items-center gap-1.5 tabular-nums">
                    <span className="font-bold text-slate-900">{formatRupiah(b.spent)}</span>
                    <span className="text-slate-400 text-[11px]">/ {formatRupiah(b.target)}</span>
                    <Badge
                      variant={isOver ? "destructive" : isWarning ? "secondary" : "success"}
                      className="text-[10px] font-bold px-2 py-0"
                    >
                      {percent}%
                    </Badge>
                  </div>
                </div>

                <Progress
                  value={Math.min(100, percent)}
                  className="h-2 bg-slate-100 rounded-full"
                  indicatorClassName={indicatorColor}
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
