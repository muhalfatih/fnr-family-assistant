"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatRupiah } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryBudgetItem } from "@/components/dashboard/budget-progress";
import { Settings2, Calendar, Loader2 } from "lucide-react";

interface ManageBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMonthYear: string; // e.g. "2026-09"
  budgets: CategoryBudgetItem[];
  onSaveBudgets: (monthYear: string, updatedBudgets: CategoryBudgetItem[]) => Promise<void> | void;
  onRefresh?: () => void;
}

export function ManageBudgetModal({
  isOpen,
  onClose,
  activeMonthYear,
  budgets,
  onSaveBudgets,
  onRefresh,
}: ManageBudgetModalProps) {
  const [items, setItems] = useState<CategoryBudgetItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Month label in Indonesian
  const monthLabel = useMemo(() => {
    try {
      const [y, m] = activeMonthYear.split("-").map((s) => parseInt(s, 10));
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    } catch {
      return activeMonthYear;
    }
  }, [activeMonthYear]);

  // Fetch or sync budgets for active month
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadBudgets = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/budgets?monthYear=${encodeURIComponent(activeMonthYear)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.budgets && Array.isArray(data.budgets)) {
            setItems(data.budgets);
            return;
          }
        }
        if (isMounted) {
          setItems(budgets || []);
        }
      } catch {
        if (isMounted) {
          setItems(budgets || []);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBudgets();

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeMonthYear, budgets]);

  const handleTargetChange = (id: string, rawVal: string) => {
    const num = parseInt(rawVal.replace(/[^0-9]/g, "") || "0", 10);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, target: num } : item))
    );
  };

  const totalTarget = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.target || 0), 0);
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSaveBudgets(activeMonthYear, items);
      onRefresh?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan perubahan pagu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl gap-0">
        <form onSubmit={handleSubmit} className="space-y-0">
          {/* Header */}
          <DialogHeader className="space-y-1 pb-3 border-b border-border/40 text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Settings2 className="size-4" />
                </div>
                <DialogTitle className="text-base font-semibold tracking-tight">
                  Atur Pagu Anggaran Massal
                </DialogTitle>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md shrink-0">
                <Calendar className="size-3 text-muted-foreground" aria-hidden="true" />
                <span>{monthLabel}</span>
              </span>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-0.5">
              Sesuaikan alokasi target pagu pengeluaran seluruh kategori untuk periode aktif ini.
            </DialogDescription>
          </DialogHeader>

          {/* Category List */}
          <div className="relative py-2">
            {isLoading && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-xs z-10 flex items-center justify-center rounded-md">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-card border px-3 py-1.5 rounded-md shadow-xs">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span>Memuat data anggaran...</span>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground italic">
                Belum ada kategori anggaran. Tambahkan kategori baru melalui tombol Tambah Anggaran.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {items.map((b) => (
                  <div
                    key={b.id}
                    className="py-2.5 px-1 flex items-center justify-between gap-3 hover:bg-muted/15 transition-colors"
                  >
                    {/* Category Label */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className="size-2 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20"
                        style={{ backgroundColor: b.color || "#3b82f6" }}
                      />
                      <span className="text-xs font-medium truncate text-foreground">
                        {b.name}
                      </span>
                    </div>

                    {/* Target Input */}
                    <div className="relative flex items-center shrink-0">
                      <span className="absolute left-2.5 font-semibold text-muted-foreground text-xs select-none">
                        Rp
                      </span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={b.target > 0 ? b.target.toLocaleString("id-ID") : ""}
                        onChange={(e) => handleTargetChange(b.id, e.target.value)}
                        placeholder="0"
                        disabled={isSubmitting}
                        className="h-8 w-36 sm:w-44 pl-8 text-xs tabular-nums text-right font-semibold bg-background/50 border-border/50 hover:border-border/80 focus:border-primary/80 transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium pt-1 pb-2">{error}</p>
          )}

          {/* Total Planned Footer */}
          <div className="flex items-center justify-between pt-3.5 pb-4 mt-2 border-t border-border/40">
            <div className="space-y-0.5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Total Pagu Terencana
              </span>
              <p className="text-[11px] text-muted-foreground">
                Akumulasi pagu {items.length} kategori
              </p>
            </div>
            <span className="tabular-nums text-foreground text-base sm:text-lg font-bold">
              {formatRupiah(totalTarget)}
            </span>
          </div>

          {/* Action Footer (Full Width Stacked) */}
          <DialogFooter className="mt-0 pt-3.5 border-t border-border/40 flex flex-col gap-2 sm:flex-col sm:space-x-0 w-full">
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full h-9 text-xs font-semibold cursor-pointer gap-1.5"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Pagu Anggaran"}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full h-9 text-xs cursor-pointer"
            >
              Batal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
