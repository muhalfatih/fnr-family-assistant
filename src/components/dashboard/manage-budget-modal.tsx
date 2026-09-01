"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { formatRupiah } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CategoryBudgetItem } from "@/components/dashboard/budget-progress";
import { Calendar, Copy, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ManageBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonthYear?: string;
  budgets: CategoryBudgetItem[];
  onSaveBudgets: (monthYear: string, updatedBudgets: CategoryBudgetItem[]) => Promise<void> | void;
}

export function ManageBudgetModal({
  isOpen,
  onClose,
  initialMonthYear,
  budgets,
  onSaveBudgets,
}: ManageBudgetModalProps) {
  const currentMonthStr = useMemo(() => {
    return new Date().toISOString().substring(0, 7); // e.g. "2026-09"
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialMonthYear && initialMonthYear !== "all" ? initialMonthYear : currentMonthStr
  );
  const [items, setItems] = useState<CategoryBudgetItem[]>(budgets);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  // Generate structured list of months (3 future months, current month, 6 past months)
  const monthOptions = useMemo(() => {
    const list: { value: string; label: string; isFuture: boolean; isCurrent: boolean }[] = [];
    const baseDate = new Date();

    // 3 future months (+3, +2, +1)
    for (let i = 3; i >= 1; i--) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const name = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      list.push({
        value: val,
        label: `${name} (Mendatang)`,
        isFuture: true,
        isCurrent: false,
      });
    }

    // Current month (0)
    const curVal = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}`;
    const curName = baseDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    list.push({
      value: curVal,
      label: `${curName} (Bulan Ini)`,
      isFuture: false,
      isCurrent: true,
    });

    // 6 past months (-1 to -6)
    for (let i = 1; i <= 6; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const name = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      list.push({
        value: val,
        label: name,
        isFuture: false,
        isCurrent: false,
      });
    }

    return list;
  }, []);

  // Fetch budgets whenever selectedMonth changes
  const fetchMonthBudgets = useCallback(async (monthYear: string) => {
    setIsLoadingMonth(true);
    setCopiedMsg(null);
    try {
      const res = await fetch(`/api/budgets?monthYear=${encodeURIComponent(monthYear)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.budgets && Array.isArray(data.budgets)) {
          setItems(data.budgets);
        }
      }
    } catch (err) {
      console.error("Failed to load month budgets:", err);
    } finally {
      setIsLoadingMonth(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const initial = initialMonthYear && initialMonthYear !== "all" ? initialMonthYear : currentMonthStr;
      setSelectedMonth(initial);
      fetchMonthBudgets(initial);
    }
  }, [isOpen, initialMonthYear, currentMonthStr, fetchMonthBudgets]);

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    fetchMonthBudgets(newMonth);
  };

  const handleCopyPreviousMonth = async () => {
    try {
      // Calculate previous month string
      const [yearStr, monthStr] = selectedMonth.split("-");
      const curDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
      curDate.setMonth(curDate.getMonth() - 1);
      const prevMonthStr = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, "0")}`;
      const prevMonthName = curDate.toLocaleDateString("id-ID", { month: "long" });

      setIsLoadingMonth(true);
      const res = await fetch(`/api/budgets?monthYear=${encodeURIComponent(prevMonthStr)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.budgets && Array.isArray(data.budgets)) {
          const prevMap = new Map<string, number>();
          data.budgets.forEach((b: any) => {
            if (b.name) prevMap.set(b.name, Number(b.target) || 0);
            if (b.id) prevMap.set(b.id, Number(b.target) || 0);
            if (b.category_id) prevMap.set(b.category_id, Number(b.target) || 0);
          });

          setItems((currentItems) =>
            currentItems.map((item) => {
              const prevTarget = prevMap.get(item.name) ?? prevMap.get(item.id) ?? Number(item.target) ?? 0;
              return {
                ...item,
                target: prevTarget,
              };
            })
          );
          setCopiedMsg(`Berhasil menyalin pagu dari bulan ${prevMonthName}!`);
        }
      }
    } catch (err) {
      console.error("Failed to copy previous month budget:", err);
    } finally {
      setIsLoadingMonth(false);
    }
  };

  const handleTargetChange = (id: string, rawVal: string) => {
    const cleanNum = parseInt(rawVal.replace(/[^0-9]/g, "") || "0", 10);
    setItems((prev) =>
      prev.map((b) => (b.id === id ? { ...b, target: cleanNum } : b))
    );
  };

  const totalTarget = useMemo(() => {
    return items.reduce((acc, curr) => acc + (Number(curr.target) || 0), 0);
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSaveBudgets(selectedMonth, items);
      onClose();
    } catch (err) {
      console.error("Failed to save budget:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-base font-semibold">Atur Pagu Anggaran Bulanan</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tentukan target batas pengeluaran keluarga per kategori untuk bulan yang dipilih.
            </DialogDescription>
          </DialogHeader>

          {/* Month Selector & Quick Actions Banner */}
          <div className="my-3 p-3 rounded-lg bg-muted/40 border border-border/70 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                <Label htmlFor="budgetMonthSelect" className="text-xs font-semibold shrink-0">
                  Target Bulan:
                </Label>
                <Select value={selectedMonth} onValueChange={handleMonthChange}>
                  <SelectTrigger id="budgetMonthSelect" className="h-8 text-xs font-medium bg-background min-w-[170px]" aria-label="Pilih Bulan Anggaran">
                    <SelectValue placeholder="Pilih Bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {monthOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPreviousMonth}
                disabled={isLoadingMonth}
                className="h-8 text-[11px] gap-1.5 shrink-0 bg-background hover:bg-muted font-medium"
                title="Salin target anggaran dari 1 bulan sebelumnya"
              >
                <Copy className="size-3" aria-hidden="true" />
                <span>Salin Bulan Lalu</span>
              </Button>
            </div>

            {/* Status Feedback / Alert */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <div className="flex items-center gap-1.5">
                {totalTarget > 0 ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
                    <CheckCircle2 className="size-3 mr-1" aria-hidden="true" />
                    Pagu Sudah Diatur
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">
                    <AlertCircle className="size-3 mr-1" aria-hidden="true" />
                    Pagu Belum Diatur (Kosong)
                  </Badge>
                )}
              </div>

              {copiedMsg && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                  {copiedMsg}
                </span>
              )}
            </div>
          </div>

          {/* Category Input Form */}
          <div className="relative py-1">
            {isLoadingMonth && (
              <div className="absolute inset-0 bg-background/70 backdrop-blur-xs z-10 flex items-center justify-center rounded-md">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-card border px-3 py-1.5 rounded-md shadow-sm">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  <span>Memuat data anggaran...</span>
                </div>
              </div>
            )}

            <div className="grid gap-3 max-h-[320px] overflow-y-auto pr-1">
              {items.map((b) => (
                <div key={b.id} className="grid grid-cols-2 gap-3 items-center">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: b.color || "#3b82f6" }}
                    />
                    <Label htmlFor={`budget-${b.id}`} className="text-xs font-medium truncate">
                      {b.name}
                    </Label>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 font-semibold text-muted-foreground text-xs select-none">
                      Rp
                    </span>
                    <Input
                      id={`budget-${b.id}`}
                      type="text"
                      value={b.target > 0 ? b.target.toLocaleString("id-ID") : ""}
                      placeholder="0"
                      onChange={(e) => handleTargetChange(b.id, e.target.value)}
                      className="h-8 pl-8 text-xs tabular-nums text-right font-semibold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Planned Footer */}
          <div className="flex items-center justify-between border-t border-border/70 pt-3 mt-3 text-xs font-semibold">
            <span className="text-muted-foreground">Total Pagu Terencana:</span>
            <span className="tabular-nums text-foreground text-sm font-bold">
              {formatRupiah(totalTarget)}
            </span>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingMonth}>
              {isSubmitting ? "Menyimpan..." : "Simpan Anggaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
