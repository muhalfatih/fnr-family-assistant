"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { VaultDocument } from "@/app/api/documents/route";
import { Files, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";

interface VaultSummaryCardsProps {
  documents: VaultDocument[];
}

export function VaultSummaryCards({ documents }: VaultSummaryCardsProps) {
  const total = documents.length;
  const expiringSoon = documents.filter((d) => d.status === "expiring_soon").length;
  const expired = documents.filter((d) => d.status === "expired").length;
  const permanent = documents.filter((d) => d.status === "permanent").length;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Dokumen */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total Dokumen</p>
            <p className="text-2xl font-bold tracking-tight">{total}</p>
            <p className="text-[11px] text-muted-foreground">Tersimpan di Brankas</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Files className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Segera Habis (<30 Hari) */}
      <Card className={expiringSoon > 0 ? "border-amber-500/30 bg-amber-500/5" : ""}>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Segera Habis</p>
            <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {expiringSoon}
            </p>
            <p className="text-[11px] text-muted-foreground">&le; 30 Hari ke Depan</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* 3. Sudah Kedaluwarsa */}
      <Card className={expired > 0 ? "border-destructive/30 bg-destructive/5" : ""}>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-destructive">Sudah Kedaluwarsa</p>
            <p className="text-2xl font-bold tracking-tight text-destructive">{expired}</p>
            <p className="text-[11px] text-muted-foreground">Perlu Tindakan Segera</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <XCircle className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Dokumen Permanen */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Dokumen Permanen</p>
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {permanent}
            </p>
            <p className="text-[11px] text-muted-foreground">SHM, Akta, Ijazah</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
