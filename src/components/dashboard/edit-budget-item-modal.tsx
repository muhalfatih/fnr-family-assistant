"use client";

import React, { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { CategoryBudgetItem } from "@/components/dashboard/budget-progress";
import { Pencil, Check, Loader2, Calendar } from "lucide-react";
import { formatRupiah } from "@/lib/utils";

export const COLOR_PRESETS = [
  "#10b981", // Emerald
  "#059669", // Dark Emerald
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#0284c7", // Sky Blue
  "#3b82f6", // Blue
  "#2563eb", // Royal Blue
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#a855f7", // Purple
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#ef4444", // Red
  "#dc2626", // Crimson
  "#f97316", // Orange
  "#ea580c", // Deep Orange
  "#f59e0b", // Amber
  "#eab308", // Yellow
  "#84cc16", // Lime
  "#22c55e", // Green
  "#64748b", // Slate
  "#78716c", // Stone
  "#475569", // Charcoal
];

interface EditBudgetItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CategoryBudgetItem | null;
  activeMonthYear: string; // e.g. "2026-09"
  onSuccess?: () => void;
}

export function EditBudgetItemModal({
  isOpen,
  onClose,
  item,
  activeMonthYear,
  onSuccess,
}: EditBudgetItemModalProps) {
  const [name, setName] = useState("");
  const [targetStr, setTargetStr] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Month label in Indonesian
  const monthName = React.useMemo(() => {
    try {
      const [y, m] = activeMonthYear.split("-").map((s) => parseInt(s, 10));
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    } catch {
      return activeMonthYear;
    }
  }, [activeMonthYear]);

  useEffect(() => {
    if (item && isOpen) {
      setName(item.name || "");
      setTargetStr(item.target > 0 ? item.target.toLocaleString("id-ID") : "");
      setColor(item.color || COLOR_PRESETS[0]);
      setError(null);
    }
  }, [item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    if (!name.trim()) {
      setError("Nama kategori wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const targetNum = parseInt(targetStr.replace(/[^0-9]/g, "") || "0", 10);
    const catId = item.category_id || (item.id.startsWith("cat-") ? item.id.replace(/^cat-/, "") : item.id);

    try {
      // 1. Update category details (name, color)
      const catRes = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: catId,
          name: name.trim(),
          color,
        }),
      });

      if (!catRes.ok) {
        const errData = await catRes.json();
        throw new Error(errData.error || "Gagal memperbarui kategori");
      }

      // 2. Update budget target for active month
      const budgetRes = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month_year: activeMonthYear,
          category_id: catId,
          target_amount: targetNum,
        }),
      });

      if (!budgetRes.ok) {
        const errData = await budgetRes.json();
        throw new Error(errData.error || "Gagal memperbarui target anggaran");
      }

      onClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan perubahan");
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
      <DialogContent className="sm:max-w-[440px] w-[95vw] p-5 sm:p-6 rounded-2xl gap-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader className="space-y-1 pb-3 border-b border-border/40 text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Pencil className="size-3.5" />
                </div>
                <DialogTitle className="text-base font-semibold tracking-tight">
                  Edit Anggaran Kategori
                </DialogTitle>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md shrink-0">
                <Calendar className="size-3 text-muted-foreground" aria-hidden="true" />
                <span>{monthName}</span>
              </span>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-0.5">
              Ubah batas pagu pengeluaran periode ini, serta nama dan warna label kategori.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-1">
            {/* Target Pagu Bulan Ini */}
            <div className="space-y-1.5">
              <Label htmlFor="editItemTarget" className="text-xs font-medium text-foreground">
                Target Pagu Bulan Ini (Rp)
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-semibold text-muted-foreground text-xs select-none">
                  Rp
                </span>
                <Input
                  id="editItemTarget"
                  value={targetStr}
                  onChange={(e) => {
                    const num = parseInt(e.target.value.replace(/[^0-9]/g, "") || "0", 10);
                    setTargetStr(num > 0 ? num.toLocaleString("id-ID") : "");
                    if (error) setError(null);
                  }}
                  placeholder="0"
                  className="h-9 pl-9 text-xs tabular-nums text-right font-semibold bg-background/50 border-border/60 focus:border-primary/80"
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              {item && item.spent > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Realisasi terpakai saat ini:{" "}
                  <strong className="text-foreground font-medium">{formatRupiah(item.spent)}</strong>
                </p>
              )}
            </div>

            {/* Nama Kategori */}
            <div className="space-y-1.5">
              <Label htmlFor="editItemName" className="text-xs font-medium text-foreground">
                Nama Kategori
              </Label>
              <Input
                id="editItemName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Nama kategori"
                className="h-9 text-xs bg-background/50 border-border/60 focus:border-primary/80"
                disabled={isSubmitting}
              />
            </div>

            {/* Warna Label */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Warna Label</Label>
              <div className="flex items-center gap-2.5 flex-wrap py-1">
                {COLOR_PRESETS.map((col) => {
                  const isSelected = color === col;
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setColor(col)}
                      aria-pressed={isSelected}
                      aria-label={`Pilih warna ${col}`}
                      disabled={isSubmitting}
                      className={`size-6 rounded-full inline-flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xs"
                          : "opacity-85 hover:opacity-100 hover:scale-105"
                      }`}
                      style={{ backgroundColor: col }}
                    >
                      {isSelected && (
                        <Check className="size-3.5 text-white stroke-[2.5] drop-shadow-xs" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive font-medium animate-in fade-in">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="mt-2 pt-3.5 border-t border-border/40 flex flex-col gap-2 sm:flex-col sm:space-x-0 w-full">
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full h-9 text-xs font-semibold cursor-pointer gap-1.5"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}</span>
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
