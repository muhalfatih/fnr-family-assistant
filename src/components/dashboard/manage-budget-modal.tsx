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
import {
  Calendar,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

const COLOR_PRESETS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#f97316", // Orange
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#6366f1", // Indigo
  "#ef4444", // Red
];

interface ManageBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonthYear?: string;
  budgets: CategoryBudgetItem[];
  onSaveBudgets: (monthYear: string, updatedBudgets: CategoryBudgetItem[]) => Promise<void> | void;
  onRefresh?: () => void;
  initialCreateOpen?: boolean;
}

export function ManageBudgetModal({
  isOpen,
  onClose,
  initialMonthYear,
  budgets,
  onSaveBudgets,
  onRefresh,
  initialCreateOpen = false,
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

  // Creation State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#3b82f6");
  const [newCategoryTarget, setNewCategoryTarget] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit State
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryColor, setEditCategoryColor] = useState("#3b82f6");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Deletion State
  const [deletingCategory, setDeletingCategory] = useState<CategoryBudgetItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      if (initialCreateOpen) {
        setIsCreateOpen(true);
      }
    } else {
      setIsCreateOpen(false);
      setEditingCategoryId(null);
      setDeletingCategory(null);
      setCreateError(null);
      setUpdateError(null);
    }
  }, [isOpen, initialMonthYear, currentMonthStr, fetchMonthBudgets, initialCreateOpen]);

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    fetchMonthBudgets(newMonth);
  };

  const handleCopyPreviousMonth = async () => {
    try {
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

  // Create Category Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setCreateError("Nama kategori wajib diisi");
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const cleanTarget = parseInt(newCategoryTarget.replace(/[^0-9]/g, "") || "0", 10);
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          type: "expense",
          color: newCategoryColor,
          initialTarget: cleanTarget,
          monthYear: selectedMonth,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal membuat kategori");
      }
      setNewCategoryName("");
      setNewCategoryColor("#3b82f6");
      setNewCategoryTarget("");
      setIsCreateOpen(false);
      await fetchMonthBudgets(selectedMonth);
      onRefresh?.();
    } catch (err: any) {
      setCreateError(err.message || "Gagal membuat kategori baru");
    } finally {
      setIsCreating(false);
    }
  };

  // Start Edit Category
  const handleStartEdit = (cat: CategoryBudgetItem) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setEditCategoryColor(cat.color || "#3b82f6");
    setUpdateError(null);
  };

  // Update Category Handler
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoryId) return;
    if (!editCategoryName.trim()) {
      setUpdateError("Nama kategori wajib diisi");
      return;
    }
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const targetCat = items.find((i) => i.id === editingCategoryId);
      const rawCatId = targetCat?.category_id || (editingCategoryId.startsWith("cat-") ? editingCategoryId.replace(/^cat-/, "") : editingCategoryId);
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rawCatId,
          name: editCategoryName.trim(),
          color: editCategoryColor,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal memperbarui kategori");
      }
      setEditingCategoryId(null);
      await fetchMonthBudgets(selectedMonth);
      onRefresh?.();
    } catch (err: any) {
      setUpdateError(err.message || "Gagal memperbarui kategori");
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Category Handler
  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      const rawCatId = deletingCategory.category_id || (deletingCategory.id.startsWith("cat-") ? deletingCategory.id.replace(/^cat-/, "") : deletingCategory.id);
      const res = await fetch(`/api/categories?id=${encodeURIComponent(rawCatId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menghapus kategori");
      }
      setDeletingCategory(null);
      await fetchMonthBudgets(selectedMonth);
      onRefresh?.();
    } catch (err: any) {
      console.error("Failed to delete category:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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

          {/* Form Tambah Kategori Baru (Inline Card) */}
          {isCreateOpen && (
            <div className="mb-3 p-3 sm:p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground">Tambah Kategori Anggaran Baru</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                  aria-label="Tutup form tambah"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label htmlFor="newCategoryName" className="text-[11px] font-medium">Nama Kategori</Label>
                  <Input
                    id="newCategoryName"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Misal: Kucing, Skincare, Kursus"
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="newCategoryTarget" className="text-[11px] font-medium">Target Pagu Bulan Ini (Rp)</Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 font-semibold text-muted-foreground text-xs select-none">
                      Rp
                    </span>
                    <Input
                      id="newCategoryTarget"
                      value={newCategoryTarget}
                      onChange={(e) => {
                        const num = parseInt(e.target.value.replace(/[^0-9]/g, "") || "0", 10);
                        setNewCategoryTarget(num > 0 ? num.toLocaleString("id-ID") : "");
                      }}
                      placeholder="0"
                      className="h-8 pl-8 text-xs tabular-nums text-right font-semibold bg-background"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium">Warna Label</Label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PRESETS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewCategoryColor(col)}
                      className={`size-5 rounded-full transition-transform cursor-pointer ${
                        newCategoryColor === col ? "scale-125 ring-2 ring-primary ring-offset-1" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: col }}
                      aria-label={`Pilih warna ${col}`}
                    />
                  ))}
                </div>
              </div>

              {createError && (
                <p className="text-[11px] text-destructive font-medium">{createError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-7 px-3 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isCreating}
                  onClick={handleCreateCategory}
                  className="h-7 px-3 text-xs gap-1.5"
                >
                  <Plus className="size-3" />
                  <span>{isCreating ? "Menyimpan..." : "Tambah Kategori"}</span>
                </Button>
              </div>
            </div>
          )}

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

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {items.map((b) => (
                <div
                  key={b.id}
                  className="p-2.5 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/20 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="size-2.5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20"
                        style={{ backgroundColor: b.color || "#3b82f6" }}
                      />
                      <span className="text-xs font-medium truncate text-foreground">
                        {b.name}
                      </span>
                      {b.is_default ? (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal text-muted-foreground border-border/60 shrink-0">
                          Default
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-normal text-primary bg-primary/10">
                            Kustom
                          </Badge>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(b)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Ubah nama & warna"
                            aria-label={`Ubah kategori ${b.name}`}
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCategory(b)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Hapus kategori"
                            aria-label={`Hapus kategori ${b.name}`}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right: Target Input */}
                    <div className="relative flex items-center w-[130px] sm:w-[150px] shrink-0">
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

                  {/* Inline Edit Form */}
                  {editingCategoryId === b.id && (
                    <div className="pt-2 border-t border-border/70 space-y-2.5 bg-muted/30 p-2.5 rounded-md animate-in fade-in-0 duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-foreground">Ubah Kategori Kustom</span>
                        <button
                          type="button"
                          onClick={() => setEditingCategoryId(null)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium">Nama Kategori</Label>
                        <Input
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          placeholder="Nama kategori"
                          className="h-7 text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium">Warna Label</Label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {COLOR_PRESETS.map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => setEditCategoryColor(col)}
                              className={`size-5 rounded-full transition-transform cursor-pointer ${
                                editCategoryColor === col ? "scale-125 ring-2 ring-primary ring-offset-1" : "hover:scale-110"
                              }`}
                              style={{ backgroundColor: col }}
                            />
                          ))}
                        </div>
                      </div>
                      {updateError && (
                        <p className="text-[11px] text-destructive">{updateError}</p>
                      )}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCategoryId(null)}
                          className="h-6 px-2 text-[11px]"
                        >
                          Batal
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isUpdating}
                          onClick={handleUpdateCategory}
                          className="h-6 px-2.5 text-[11px]"
                        >
                          {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Inline Delete Confirmation */}
                  {deletingCategory?.id === b.id && (
                    <div className="pt-2 border-t border-destructive/30 bg-destructive/5 p-2.5 rounded-md space-y-2 animate-in fade-in-0 duration-150">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                        <div className="text-[11px] space-y-1">
                          <p className="font-semibold text-destructive">Hapus kategori "{b.name}"?</p>
                          <p className="text-muted-foreground text-[10px] leading-relaxed">
                            Seluruh riwayat transaksi terkait akan dialihkan ke kategori default agar pembukuan keluarga tetap utuh.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-destructive/20">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingCategory(null)}
                          className="h-6 px-2 text-[11px]"
                        >
                          Batal
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={isDeleting}
                          onClick={handleDeleteCategory}
                          className="h-6 px-2.5 text-[11px]"
                        >
                          {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Button "+ Tambah Kategori Anggaran Baru" */}
              {!isCreateOpen && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  className="w-full mt-2 border-dashed border-border/80 gap-1.5 h-8 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Tambah Kategori Anggaran Baru</span>
                </Button>
              )}
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

