"use client";

import React, { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { CategoryBudgetItem } from "@/components/dashboard/budget-progress";

interface ManageBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: CategoryBudgetItem[];
  onSaveBudgets: (updatedBudgets: CategoryBudgetItem[]) => void;
}

export function ManageBudgetModal({
  isOpen,
  onClose,
  budgets,
  onSaveBudgets,
}: ManageBudgetModalProps) {
  const [items, setItems] = useState<CategoryBudgetItem[]>(budgets);

  useEffect(() => {
    setItems(budgets);
  }, [budgets]);

  const handleTargetChange = (id: string, rawVal: string) => {
    const cleanNum = parseInt(rawVal.replace(/[^0-9]/g, "") || "0", 10);
    setItems((prev) =>
      prev.map((b) => (b.id === id ? { ...b, target: cleanNum } : b))
    );
  };

  const totalTarget = items.reduce((acc, curr) => acc + curr.target, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBudgets(items);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Atur Pagu Anggaran Bulanan</DialogTitle>
            <DialogDescription>
              Tentukan target batas pengeluaran keluarga per kategori setiap bulan.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-4 max-h-[360px] overflow-y-auto pr-1">
            {items.map((b) => (
              <div key={b.id} className="grid grid-cols-2 gap-3 items-center">
                <Label htmlFor={`budget-${b.id}`} className="text-xs font-medium truncate">
                  {b.name}
                </Label>
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
                    className="h-8 pl-8 text-xs tabular-nums text-right font-medium"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t pt-3 text-xs font-semibold">
            <span>Total Pagu Anggaran:</span>
            <span className="tabular-nums text-foreground">{formatRupiah(totalTarget)}</span>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">
              Simpan Anggaran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
