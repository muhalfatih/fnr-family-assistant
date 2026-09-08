"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WalletCards, RefreshCw, Plus } from "lucide-react";

interface DashboardHeaderProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  onRefresh: () => void;
  isSyncing?: boolean;
  onAddTransaction: () => void;
}

export function DashboardHeader({
  selectedPeriod,
  onPeriodChange,
  onRefresh,
  isSyncing = false,
  onAddTransaction,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <WalletCards className="size-5 sm:size-6 text-foreground shrink-0" aria-hidden="true" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
            Keuangan & Arus Kas
          </h1>
          {isSyncing && (
            <span className="inline-flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground bg-muted px-2 py-0.5 rounded-full animate-pulse shrink-0">
              <RefreshCw className="size-2.5 animate-spin" aria-hidden="true" />
              <span>Sync</span>
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Pusat kendali keuangan, analitik arus kas, dan saldo rekening keluarga.
        </p>
      </div>

      {/* Structured Responsive Action Toolbar */}
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger
            className="flex-1 sm:flex-initial sm:w-[170px] h-8 text-xs px-2.5 rounded-md bg-background"
            aria-label="Filter Periode Bulan"
          >
            <SelectValue placeholder="Pilih Periode" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all" className="text-xs">
                Semua Periode
              </SelectItem>
              <SelectItem value="2026-12" className="text-xs">
                Desember 2026
              </SelectItem>
              <SelectItem value="2026-11" className="text-xs">
                November 2026
              </SelectItem>
              <SelectItem value="2026-10" className="text-xs">
                Oktober 2026
              </SelectItem>
              <SelectItem value="2026-09" className="text-xs font-semibold">
                September 2026 (Bulan Ini)
              </SelectItem>
              <SelectItem value="2026-08" className="text-xs">
                Agustus 2026
              </SelectItem>
              <SelectItem value="2026-07" className="text-xs">
                Juli 2026
              </SelectItem>
              <SelectItem value="2026-06" className="text-xs">
                Juni 2026
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isSyncing}
          className="gap-1.5 h-8 text-xs px-2.5 rounded-md shrink-0 active:scale-98"
          title="Segarkan data sekarang"
        >
          <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} aria-hidden="true" />
          <span className="hidden sm:inline">Segarkan</span>
        </Button>

        <Button
          size="sm"
          onClick={onAddTransaction}
          className="h-8 text-xs px-3 rounded-md shadow-sm shrink-0 whitespace-nowrap gap-1.5"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          <span>Catat Transaksi</span>
        </Button>
      </div>
    </div>
  );
}
