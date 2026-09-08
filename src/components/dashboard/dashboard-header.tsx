"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WalletCards, RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <PageHeader
      title="Keuangan & Arus Kas"
      description="Pusat kendali keuangan, analitik arus kas, dan saldo rekening keluarga."
      icon={WalletCards}
      isSyncing={isSyncing}
    >
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
        title="Segarkan data sekarang"
      >
        <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} aria-hidden="true" />
        <span className="hidden sm:inline">Segarkan</span>
      </Button>

      <Button
        size="sm"
        onClick={onAddTransaction}
        className="flex-1 sm:flex-initial"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        <span>Catat Transaksi</span>
      </Button>
    </PageHeader>
  );
}
