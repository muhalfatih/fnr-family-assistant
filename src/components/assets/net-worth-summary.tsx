"use client";

import React from "react";
import { formatRupiah, formatCompactNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Gem, Landmark, Wallet, ArrowUpRight } from "lucide-react";

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
  const assetRatio = 100 - Math.min(100, debtToAssetRatio);

  return (
    <Card className="rounded-xl border border-border/80 bg-card text-card-foreground">
      <CardContent className="p-5 space-y-5">
        {/* Top: Net Worth Hero & Visual Asset vs Debt Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Kekayaan Bersih (Net Worth)
              </span>
              <Badge variant="outline" className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                Aset Bersih Keluarga
              </Badge>
            </div>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-foreground truncate">
              {formatRupiah(netWorth)}
            </p>
          </div>

          {/* Asset vs Debt Health Indicator */}
          <div className="min-w-[240px] space-y-1.5 text-right md:text-left">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Komposisi Neraca:</span>
              <span className="tabular-nums font-medium text-foreground">
                Hutang {debtToAssetRatio}% / Ekuitas {assetRatio}%
              </span>
            </div>
            {/* Visual Balance Bar */}
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
              <div
                style={{ width: `${assetRatio}%` }}
                className="bg-emerald-600 dark:bg-emerald-500 h-full transition-all duration-500"
                title={`Aset Bersih: ${assetRatio}%`}
              />
              <div
                style={{ width: `${Math.min(100, debtToAssetRatio)}%` }}
                className="bg-destructive h-full transition-all duration-500"
                title={`Kewajiban Hutang: ${debtToAssetRatio}%`}
              />
            </div>
          </div>
        </div>

        {/* Bottom: 3-Pillar Ledger Strip (Kas + Aset Fisik - Hutang) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3 border-t">
          {/* Pillar 1: Kas */}
          <div className="p-2 sm:p-3 rounded-lg bg-muted/40 border space-y-0.5 sm:space-y-1">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                <Wallet className="size-3 sm:size-3.5 text-blue-500 shrink-0" aria-hidden="true" />
                <span className="truncate">Kas Aktif</span>
              </span>
            </div>
            <p className="text-xs sm:text-lg font-bold tracking-tight tabular-nums text-foreground truncate" title={formatRupiah(totalCash)}>
              <span className="sm:hidden">{formatCompactNumber(totalCash)}</span>
              <span className="hidden sm:inline">{formatRupiah(totalCash)}</span>
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">Bank & tunai</p>
          </div>

          {/* Pillar 2: Aset Fisik & Investasi */}
          <div className="p-2 sm:p-3 rounded-lg bg-muted/40 border space-y-0.5 sm:space-y-1">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                <Gem className="size-3 sm:size-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                <span className="truncate">Aset Fisik</span>
              </span>
            </div>
            <p className="text-xs sm:text-lg font-bold tracking-tight tabular-nums text-foreground truncate" title={formatRupiah(totalAssets)}>
              <span className="sm:hidden">{formatCompactNumber(totalAssets)}</span>
              <span className="hidden sm:inline">{formatRupiah(totalAssets)}</span>
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">Properti & emas</p>
          </div>

          {/* Pillar 3: Kewajiban / Hutang */}
          <div className="p-2 sm:p-3 rounded-lg bg-muted/40 border space-y-0.5 sm:space-y-1">
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                <Landmark className="size-3 sm:size-3.5 text-destructive shrink-0" aria-hidden="true" />
                <span className="truncate">Hutang</span>
              </span>
            </div>
            <p className="text-xs sm:text-lg font-bold tracking-tight tabular-nums text-destructive truncate" title={formatRupiah(totalLiabilities)}>
              <span className="sm:hidden">{formatCompactNumber(totalLiabilities)}</span>
              <span className="hidden sm:inline">{formatRupiah(totalLiabilities)}</span>
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">KPR & cicilan</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
