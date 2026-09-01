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
        return <Home className="size-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />;
      case "vehicle_loan":
        return <Car className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
      case "credit_card":
        return <CreditCard className="size-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />;
      default:
        return <Landmark className="size-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />;
    }
  };

  const getLiabilityLabel = (type: string) => {
    switch (type) {
      case "mortgage":
        return "KPR";
      case "vehicle_loan":
        return "Kendaraan";
      case "credit_card":
        return "Kartu Kredit";
      case "personal_loan":
        return "Pinjaman";
      default:
        return "Lainnya";
    }
  };

  return (
    <Card className="rounded-xl border border-border/80 bg-card">
      <CardHeader className="flex flex-row items-center justify-between p-5 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">Daftar Hutang & Cicilan Aktif</CardTitle>
            <Badge variant="outline" className="text-[11px] font-normal">
              {liabilities.length} Pinjaman
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Monitoring sisa saldo pinjaman, cicilan bulanan, dan progres pelunasan.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y border-t">
          {liabilities.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-sm font-medium text-foreground">Tidak ada kewajiban hutang aktif.</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Keluarga Anda bebas dari catatan hutang atau cicilan aktif saat ini.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAddModal}
                className="mt-4 gap-1.5 h-9 text-xs"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                <span>Tambah Catatan Pinjaman</span>
              </Button>
            </div>
          ) : (
            liabilities.map((item) => {
              const paidAmount = Math.max(0, item.total_amount - item.remaining_amount);
              const paidPercent = item.total_amount > 0 ? Math.round((paidAmount / item.total_amount) * 100) : 0;

              return (
                <div
                  key={item.id}
                  className="p-4 sm:px-5 transition-colors hover:bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 text-foreground mt-0.5 sm:mt-0">
                      {getLiabilityIcon(item.type)}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                          {getLiabilityLabel(item.type)}
                        </Badge>
                      </div>

                      {/* Progress bar and details */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                        <div className="flex-1 max-w-xs space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span>Lunas: {paidPercent}%</span>
                            <span>Plafon: {formatRupiah(item.total_amount)}</span>
                          </div>
                          <Progress value={paidPercent} className="h-1.5" />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                        {item.monthly_installment > 0 && (
                          <span>Cicilan: <strong className="font-medium text-foreground">{formatRupiah(item.monthly_installment)}/bln</strong></span>
                        )}
                        {item.due_date_day && (
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-muted-foreground" aria-hidden="true" />
                            <span>Tiap tgl {item.due_date_day}</span>
                          </span>
                        )}
                        {item.notes && <span className="hidden md:inline">• {item.notes}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-11 sm:pl-3 pt-2 sm:pt-0 border-t sm:border-t-0">
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] text-muted-foreground uppercase font-medium">Sisa Pokok</p>
                      <p className="font-semibold text-sm sm:text-base tabular-nums text-destructive">
                        {formatRupiah(item.remaining_amount)}
                      </p>
                    </div>
                    {onDeleteLiability && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteLiability(item.id)}
                        className="size-7 text-muted-foreground hover:text-destructive rounded-md"
                        title="Hapus Catatan"
                        aria-label={`Hapus hutang ${item.name}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    )}
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
