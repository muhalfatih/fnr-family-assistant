"use client";

import React from "react";
import { formatRupiah } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";

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
  onOpenManageBudget?: () => void;
}

export function BudgetProgress({ budgets, onOpenManageBudget }: BudgetProgressProps) {
  return (
    <Card className="rounded-xl border border-border/80 bg-card">
      <CardHeader className="flex flex-row items-center justify-between p-5 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Alokasi Anggaran Bulanan</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Realisasi belanja terhadap target pagu anggaran keluarga
          </CardDescription>
        </div>
        {onOpenManageBudget && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenManageBudget}
            className="h-8 gap-1.5 text-xs font-normal rounded-md"
          >
            <Settings2 className="size-3.5" aria-hidden="true" />
            <span>Atur Pagu</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-5 pt-2 flex flex-col gap-4">
        {budgets.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-6 text-center">
            Belum ada alokasi anggaran bulan ini.
          </p>
        ) : (
          budgets.map((b) => {
            const percent = b.target > 0 ? Math.round((b.spent / b.target) * 100) : 0;
            const isOver = percent > 100;
            const isWarning = percent >= 80 && percent <= 100;

            const indicatorColor = isOver
              ? "bg-destructive"
              : isWarning
              ? "bg-amber-500"
              : "bg-emerald-600 dark:bg-emerald-500";

            return (
              <div key={b.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium truncate min-w-0 text-foreground">
                    {b.name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                    <span className={isOver ? "font-semibold text-destructive" : "text-muted-foreground"}>
                      {formatRupiah(b.spent)}
                    </span>
                    <span className="text-muted-foreground">/ {formatRupiah(b.target)}</span>
                    <Badge
                      variant={isOver ? "destructive" : "outline"}
                      className={`text-[10px] px-1 py-0 font-medium ${
                        isOver
                          ? ""
                          : isWarning
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "text-muted-foreground"
                      }`}
                    >
                      {percent}%
                    </Badge>
                  </div>
                </div>

                <Progress
                  value={Math.min(100, percent)}
                  className="h-1.5"
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
