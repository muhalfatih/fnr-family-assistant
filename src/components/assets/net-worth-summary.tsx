"use client";

import React from "react";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, Gem, Landmark, PieChart } from "lucide-react";

interface NetWorthSummaryProps {
  totalCash: number;
  totalAssets: number;
  totalLiabilities: number;
}

export function NetWorthSummary({
  totalCash,
  totalAssets,
  totalLiabilities,
}: NetWorthSummaryProps) {
  const grossAssets = totalCash + totalAssets;
  const netWorth = Math.max(0, grossAssets - totalLiabilities);
  const debtToAssetRatio = grossAssets > 0 ? Math.round((totalLiabilities / grossAssets) * 100) : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Kekayaan Bersih (Net Worth) */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Kekayaan Bersih (Net Worth)</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums truncate text-emerald-600 dark:text-emerald-400">
              {formatRupiah(netWorth)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Total aset dikurangi kewajiban
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Nilai Aset */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Total Nilai Aset</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums truncate text-foreground">
              {formatRupiah(grossAssets)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Kas `{formatRupiah(totalCash)}` + Fisik `{formatRupiah(totalAssets)}`
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Gem className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Total Liabilitas / Hutang */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Total Sisa Hutang</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums truncate text-destructive">
              {formatRupiah(totalLiabilities)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              KPR, pinjaman & cicilan aktif
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Landmark className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Rasio Beban Hutang */}
      <Card>
        <CardContent className="p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Rasio Hutang terhadap Aset</p>
              <p className="text-2xl font-bold tracking-tight tabular-nums truncate text-foreground">
                {debtToAssetRatio}%
              </p>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <PieChart className="size-5" aria-hidden="true" />
            </div>
          </div>
          <div>
            <Progress
              value={Math.min(100, debtToAssetRatio)}
              className="h-1.5"
              indicatorClassName={
                debtToAssetRatio > 50
                  ? "bg-destructive"
                  : debtToAssetRatio > 30
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
