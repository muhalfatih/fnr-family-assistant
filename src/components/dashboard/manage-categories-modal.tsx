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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Lock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Category } from "@/lib/types/database";

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
  "#64748b", // Slate
];

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ManageCategoriesModal({
  isOpen,
  onClose,
  onSuccess,
}: ManageCategoriesModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State untuk form tambah kategori baru
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // State untuk inline edit kategori
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // State untuk konfirmasi hapus kategori
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch categories saat modal dibuka
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Gagal memuat kategori:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setNewName("");
      setNewColor(COLOR_PRESETS[0]);
      setAddError(null);
      setEditingId(null);
      setEditError(null);
      setCategoryToDelete(null);
    }
  }, [isOpen]);

  // Handler: Tambah Kategori Baru (tanpa target)
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setAddError("Nama kategori wajib diisi");
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          color: newColor,
          type: "expense",
          initialTarget: 0,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menambahkan kategori");
      }

      setNewName("");
      setNewColor(COLOR_PRESETS[0]);
      toast.success("Kategori baru berhasil ditambahkan");
      await fetchCategories();
      onSuccess?.();
    } catch (err: any) {
      setAddError(err.message || "Terjadi kesalahan saat menyimpan kategori");
    } finally {
      setIsAdding(false);
    }
  };

  // Handler: Mulai Edit Inline
  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || COLOR_PRESETS[0]);
    setEditError(null);
  };

  // Handler: Batalkan Edit Inline
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
    setEditError(null);
  };

  // Handler: Simpan Edit Inline (Nama & Warna)
  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) {
      setEditError("Nama kategori tidak boleh kosong");
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: editName.trim(),
          color: editColor,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal memperbarui kategori");
      }

      setEditingId(null);
      toast.success("Kategori berhasil diperbarui");
      await fetchCategories();
      onSuccess?.();
    } catch (err: any) {
      setEditError(err.message || "Terjadi kesalahan saat memperbarui kategori");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handler: Konfirmasi & Eksekusi Hapus Kategori
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/categories?id=${categoryToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menghapus kategori");
      }

      toast.success(`Kategori "${categoryToDelete.name}" dihapus. Transaksi dialihkan ke "Lainnya"`);
      setCategoryToDelete(null);
      await fetchCategories();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menghapus kategori");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter hanya kategori pengeluaran (expense)
  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open && !isAdding && !isSavingEdit && !isDeleting) {
            onClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] w-[95vw] p-5 sm:p-6 rounded-2xl gap-0 max-h-[90vh] flex flex-col">
          {/* Header */}
          <DialogHeader className="space-y-1 pb-3 border-b border-border/40 text-left shrink-0">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <SlidersHorizontal className="size-4" />
              </div>
              <DialogTitle className="text-base font-semibold tracking-tight">
                Kelola Anggaran
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-0.5">
              Tambah kategori anggaran baru, ubah nama & warna, atau hapus kategori belanja.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-0.5">
            {/* Form Tambah Kategori Baru */}
            <form
              onSubmit={handleAddCategory}
              className="p-3.5 rounded-xl border border-border/50 bg-muted/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Plus className="size-3.5 text-primary" />
                  Tambah Kategori Baru
                </span>
                <span className="text-[11px] text-muted-foreground">Tanpa target pagu</span>
              </div>

              {/* Input Nama */}
              <div className="space-y-1">
                <Input
                  id="newCategoryNameInput"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (addError) setAddError(null);
                  }}
                  placeholder="Misal: Hobi & Buku, Donasi, Perawatan"
                  className="h-8.5 text-xs bg-background border-border/60 focus:border-primary"
                  disabled={isAdding}
                />
              </div>

              {/* Color Presets */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Warna Label</Label>
                <div className="flex items-center gap-2 flex-wrap py-0.5">
                  {COLOR_PRESETS.map((col) => {
                    const isSelected = newColor === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewColor(col)}
                        aria-pressed={isSelected}
                        aria-label={`Pilih warna ${col}`}
                        disabled={isAdding}
                        className={`size-5.5 rounded-full inline-flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          isSelected
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xs scale-105"
                            : "opacity-80 hover:opacity-100 hover:scale-105"
                        }`}
                        style={{ backgroundColor: col }}
                      >
                        {isSelected && (
                          <Check className="size-3 text-white stroke-[2.5] drop-shadow-xs" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {addError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2 rounded-lg">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={isAdding || !newName.trim()}
                className="w-full h-8 text-xs font-medium cursor-pointer"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5 mr-1" />
                    Tambah Kategori
                  </>
                )}
              </Button>
            </form>

            {/* Daftar Kategori Anggaran */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Daftar Kategori Anggaran
                </span>
                <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-medium">
                  {expenseCategories.length} kategori
                </span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  <span className="text-xs">Memuat daftar kategori...</span>
                </div>
              ) : expenseCategories.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border/60 rounded-xl">
                  <p className="text-xs text-muted-foreground">Belum ada kategori anggaran.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 divide-y divide-border/30 bg-muted/10 overflow-hidden">
                  {expenseCategories.map((cat) => {
                    const isLainnya = cat.name.toLowerCase() === "lainnya";
                    const isEditing = editingId === cat.id;

                    if (isEditing) {
                      return (
                        <div
                          key={cat.id}
                          className="p-3 bg-primary/5 space-y-2.5 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => {
                                setEditName(e.target.value);
                                if (editError) setEditError(null);
                              }}
                              placeholder="Nama kategori"
                              className="h-8 text-xs bg-background flex-1"
                              disabled={isSavingEdit}
                              autoFocus
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveEdit(cat.id)}
                              disabled={isSavingEdit || !editName.trim()}
                              className="h-8 text-xs gap-1 cursor-pointer"
                            >
                              {isSavingEdit ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Check className="size-3.5" />
                              )}
                              <span>Simpan</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              disabled={isSavingEdit}
                              className="h-8 text-xs cursor-pointer px-2"
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>

                          {/* Mini Color Picker for Edit */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground mr-1">Warna:</span>
                            {COLOR_PRESETS.map((col) => {
                              const isSelected = editColor === col;
                              return (
                                <button
                                  key={col}
                                  type="button"
                                  onClick={() => setEditColor(col)}
                                  disabled={isSavingEdit}
                                  className={`size-4.5 rounded-full inline-flex items-center justify-center transition-all cursor-pointer ${
                                    isSelected
                                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-110"
                                      : "opacity-75 hover:opacity-100"
                                  }`}
                                  style={{ backgroundColor: col }}
                                >
                                  {isSelected && (
                                    <Check className="size-2.5 text-white stroke-[2.5]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {editError && (
                            <p className="text-[11px] text-destructive flex items-center gap-1">
                              <AlertCircle className="size-3" />
                              {editError}
                            </p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2.5 sm:px-3 hover:bg-muted/30 transition-colors"
                      >
                        {/* Kiri: Indikator Warna & Nama */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="size-3 rounded-full shrink-0 ring-1 ring-border/40"
                            style={{ backgroundColor: cat.color || "#64748b" }}
                          />
                          <span className="text-xs font-medium text-foreground truncate">
                            {cat.name}
                          </span>
                          {isLainnya && (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-[10px] font-normal py-0 h-4.5 px-1.5 bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                            >
                              <Lock className="size-2.5" />
                              Default
                            </Badge>
                          )}
                        </div>

                        {/* Kanan: Aksi Edit & Hapus (dikunci jika Lainnya) */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isLainnya ? (
                            <span className="text-[11px] text-muted-foreground/70 italic px-2 py-0.5">
                              Terkunci
                            </span>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEdit(cat)}
                                title="Ubah nama dan warna"
                                className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setCategoryToDelete(cat)}
                                title="Hapus kategori"
                                className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="pt-3 border-t border-border/40 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full sm:w-auto h-8 text-xs cursor-pointer"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Konfirmasi Hapus Kategori */}
      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setCategoryToDelete(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-[420px] w-[95vw] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Hapus Kategori &ldquo;{categoryToDelete?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Seluruh riwayat transaksi yang tercatat pada kategori ini akan otomatis dialihkan ke kategori default{" "}
              <strong className="text-foreground">&ldquo;Lainnya&rdquo;</strong>. Anggaran pagu untuk kategori ini juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={isDeleting}
              className="h-8.5 text-xs cursor-pointer"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="h-8.5 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Menghapus...
                </>
              ) : (
                "Ya, Hapus Kategori"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
