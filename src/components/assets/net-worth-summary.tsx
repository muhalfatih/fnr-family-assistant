"use client";

import React from "react";
import { formatRupiah } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Kekayaan Bersih (Net Worth) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Kekayaan Bersih (Net Worth)
          </CardTitle>
          <ShieldCheck className="size-4 text-emerald-600" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 tabular-nums truncate">
            {formatRupiah(netWorth)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            (Total Kas + Aset) - Total Hutang
          </p>
        </CardContent>
      </Card>

      {/* 2. Total Aset Fisik & Investasi */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Nilai Aset
          </CardTitle>
          <Gem className="size-4 text-primary" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight tabular-nums truncate">
            {formatRupiah(grossAssets)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            Kas: {formatRupiah(totalCash)} · Non-Kas: {formatRupiah(totalAssets)}
          </p>
        </CardContent>
      </Card>

      {/* 3. Total Liabilitas / Hutang */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Sisa Hutang
          </CardTitle>
          <Landmark className="size-4 text-destructive" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight text-destructive tabular-nums truncate">
            {formatRupiah(totalLiabilities)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            KPR, pinjaman & cicilan aktif
          </p>
        </CardContent>
      </Card>

      {/* 4. Rasio Beban Hutang */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Rasio Hutang terhadap Aset
          </CardTitle>
          <PieChart className="size-4 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight tabular-nums truncate">
            {debtToAssetRatio}%
          </div>
          <div className="mt-2.5">
            <Progress
              value={Math.min(100, debtToAssetRatio)}
              className="h-2"
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
