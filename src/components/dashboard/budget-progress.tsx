"use client";

import React from "react";
import { formatRupiah } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings2, Pencil } from "lucide-react";

export interface CategoryBudgetItem {
  id: string;
  category_id?: string;
  name: string;
  spent: number;
  target: number;
  icon?: string;
  color?: string;
  is_default?: boolean;
}

interface BudgetProgressProps {
  budgets: CategoryBudgetItem[];
  onOpenManageBudget?: () => void;
  onEditItem?: (item: CategoryBudgetItem) => void;
}

export function BudgetProgress({ budgets, onOpenManageBudget, onEditItem }: BudgetProgressProps) {
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
      <CardContent className="p-4 sm:p-5 pt-2 flex flex-col gap-3 sm:gap-4">
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
              <div key={b.id} className="flex flex-col gap-1.5 p-2 sm:p-2.5 rounded-lg hover:bg-muted/30 transition-colors border border-border/40 sm:border-transparent">
                {/* Row 1: Category Name, Badge & Edit Icon */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="size-2 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20"
                      style={{ backgroundColor: b.color || "#3b82f6" }}
                    />
                    <span className="font-semibold text-xs sm:text-sm truncate text-foreground" title={b.name}>
                      {b.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge
                      variant={isOver ? "destructive" : "outline"}
                      className={`text-[10.5px] tabular-nums font-semibold px-1.5 py-0 shrink-0 ${
                        isOver
                          ? ""
                          : isWarning
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          : "text-muted-foreground border-border/80"
                      }`}
                    >
                      {percent}%
                    </Badge>
                    {onEditItem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditItem(b)}
                        className="size-6 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                        title={`Edit anggaran ${b.name}`}
                        aria-label={`Edit anggaran ${b.name}`}
                      >
                        <Pencil className="size-3" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Row 2: Spent / Target Numbers */}
                <div className="flex items-center justify-between text-[11px] sm:text-xs tabular-nums text-muted-foreground">
                  <span>
                    Terpakai:{" "}
                    <strong className={isOver ? "font-semibold text-destructive" : "font-medium text-foreground"}>
                      {formatRupiah(b.spent)}
                    </strong>
                  </span>
                  <span>
                    Pagu: <strong className="font-medium text-foreground">{formatRupiah(b.target)}</strong>
                  </span>
                </div>

                {/* Row 3: Progress Bar */}
                <Progress
                  value={Math.min(100, percent)}
                  className="h-1.5 mt-0.5"
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
