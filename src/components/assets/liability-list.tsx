"use client";

import React from "react";
import { formatRupiah } from "@/lib/utils";
import { Liability } from "@/lib/types/database";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Landmark, CreditCard, Car, Home, Trash2, Plus, Calendar } from "lucide-react";

interface LiabilityListProps {
  liabilities: Liability[];
  onOpenAddModal: () => void;
  onDeleteLiability?: (id: string) => void;
}

export function LiabilityList({ liabilities, onOpenAddModal, onDeleteLiability }: LiabilityListProps) {
  const getLiabilityIcon = (type: string) => {
    switch (type) {
      case "mortgage":
        return <Home className="size-4 text-blue-600" aria-hidden="true" />;
      case "vehicle_loan":
        return <Car className="size-4 text-emerald-600" aria-hidden="true" />;
      case "credit_card":
        return <CreditCard className="size-4 text-purple-600" aria-hidden="true" />;
      default:
        return <Landmark className="size-4 text-rose-600" aria-hidden="true" />;
    }
  };

  const getLiabilityLabel = (type: string) => {
    switch (type) {
      case "mortgage":
        return "KPR Rumah";
      case "vehicle_loan":
        return "Cicilan Kendaraan";
      case "credit_card":
        return "Kartu Kredit";
      case "personal_loan":
        return "Pinjaman Pribadi";
      default:
        return "Hutang Lainnya";
    }
  };

  const totalRemaining = liabilities.reduce((acc, curr) => acc + curr.remaining_amount, 0);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle>Daftar Hutang & Cicilan Aktif</CardTitle>
            <Badge variant="outline" className="text-xs font-normal">
              {liabilities.length} Pinjaman
            </Badge>
          </div>
          <CardDescription>
            Monitoring sisa saldo pinjaman, cicilan bulanan, dan progres pelunasan
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-muted-foreground uppercase font-medium">Total Sisa Pokok</p>
            <p className="text-sm font-bold tabular-nums text-destructive">{formatRupiah(totalRemaining)}</p>
          </div>
          <Button onClick={onOpenAddModal} size="sm" className="gap-1.5">
            <Plus className="size-4" aria-hidden="true" />
            <span>Tambah Hutang</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y">
          {liabilities.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">Tidak ada hutang aktif.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Keluarga saat ini bebas dari kewajiban cicilan atau pinjaman terdaftar.
              </p>
            </div>
          ) : (
            liabilities.map((l) => {
              const paidAmount = Math.max(0, l.total_amount - l.remaining_amount);
              const paidPercent = l.total_amount > 0 ? Math.round((paidAmount / l.total_amount) * 100) : 0;

              return (
                <div
                  key={l.id}
                  className="p-4 sm:px-6 transition-colors hover:bg-muted/50 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-foreground">
                        {getLiabilityIcon(l.type)}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-sm truncate">{l.name}</span>
                          <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-normal">
                            {getLiabilityLabel(l.type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate mt-0.5">
                          <span>Cicilan: <strong className="text-foreground">{formatRupiah(l.monthly_installment)}/bln</strong></span>
                          {l.due_date_day && (
                            <span className="flex items-center gap-1">
                              • <Calendar className="size-3" aria-hidden="true" />
                              Jatuh tempo tgl {l.due_date_day}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pl-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Sisa Pokok</p>
                        <p className="font-semibold text-sm sm:text-base tabular-nums text-destructive">
                          {formatRupiah(l.remaining_amount)}
                        </p>
                      </div>
                      {onDeleteLiability && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteLiability(l.id)}
                          className="size-7 text-muted-foreground hover:text-destructive"
                          title="Hapus Catatan Hutang"
                          aria-label={`Hapus hutang ${l.name}`}
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Pelunasan */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progres Pelunasan ({paidPercent}%)</span>
                      <span className="tabular-nums">
                        Terbayar {formatRupiah(paidAmount)} dari total {formatRupiah(l.total_amount)}
                      </span>
                    </div>
                    <Progress value={paidPercent} className="h-1.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
