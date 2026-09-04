"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Lock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Category } from "@/lib/types/database";
import { COLOR_PRESETS } from "./edit-budget-item-modal";

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
  const [view, setView] = useState<"list" | "add" | "edit">("list");

  // State form Tambah
  const [addName, setAddName] = useState("");
  const [addColor, setAddColor] = useState(COLOR_PRESETS[0]);

  // State form Edit
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(COLOR_PRESETS[0]);

  // State bersama
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // State dialog konfirmasi hapus
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
      setView("list");
      setAddName("");
      setAddColor(COLOR_PRESETS[0]);
      setEditingCategory(null);
      setFormError(null);
      setCategoryToDelete(null);
    }
  }, [isOpen]);

  // Deduplikasi defensif kategori belanja (expense)
  const expenseCategories = useMemo(() => {
    const seen = new Map<string, Category>();
    for (const c of categories.filter((cat) => cat.type === "expense")) {
      const key = c.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, c);
      } else if (c.is_default && !seen.get(key)!.is_default) {
        seen.set(key, c);
      }
    }
    return Array.from(seen.values());
  }, [categories]);

  // Handler: Tambah Kategori Baru
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addName.trim();
    if (!trimmed) {
      setFormError("Nama kategori wajib diisi");
      return;
    }

    if (trimmed.toLowerCase() === "lainnya") {
      setFormError("Kategori 'Lainnya' sudah ada sebagai kategori default.");
      return;
    }

    const duplicate = expenseCategories.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setFormError(`Kategori "${trimmed}" sudah ada.`);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          color: addColor,
          type: "expense",
          initialTarget: 0,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menambahkan kategori");
      }

      toast.success(`Kategori "${trimmed}" berhasil ditambahkan`);
      await fetchCategories();
      setView("list");
      onSuccess?.();
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan saat menambahkan kategori");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Simpan Edit Kategori
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    const trimmed = editName.trim();
    if (!trimmed) {
      setFormError("Nama kategori wajib diisi");
      return;
    }

    if (trimmed.toLowerCase() === "lainnya" && editingCategory.name.toLowerCase() !== "lainnya") {
      setFormError("Nama 'Lainnya' dicadangkan untuk kategori default sistem.");
      return;
    }

    const duplicate = expenseCategories.some(
      (c) => c.id !== editingCategory.id && c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setFormError(`Kategori dengan nama "${trimmed}" sudah ada.`);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCategory.id,
          name: trimmed,
          color: editColor,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal memperbarui kategori");
      }

      toast.success("Kategori berhasil diperbarui");
      await fetchCategories();
      setView("list");
      onSuccess?.();
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan saat memperbarui kategori");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Eksekusi Hapus Kategori
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

      toast.success(
        `Kategori "${categoryToDelete.name}" dihapus. Transaksi dialihkan ke "Lainnya"`
      );
      setCategoryToDelete(null);
      await fetchCategories();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menghapus kategori");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open && !isSubmitting && !isDeleting) {
            onClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px] w-[95vw] p-5 sm:p-6 rounded-2xl gap-0">
          {/* VIEW: DAFTAR KATEGORI */}
          {view === "list" && (
            <div className="space-y-4">
              <DialogHeader className="space-y-1 pb-3 border-b border-border/40 text-left">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <SlidersHorizontal className="size-3.5" />
                    </div>
                    <DialogTitle className="text-base font-semibold tracking-tight">
                      Kelola Kategori Anggaran
                    </DialogTitle>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md shrink-0">
                    <span>{expenseCategories.length} Kategori</span>
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground pt-0.5">
                  Atur nama, warna label, atau tambah kategori belanja baru.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-1">
                {/* Tombol Tambah Kategori Baru */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddName("");
                    setAddColor(COLOR_PRESETS[0]);
                    setFormError(null);
                    setView("add");
                  }}
                  className="w-full h-9 text-xs font-semibold gap-1.5 border-dashed border-border/80 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>Tambah Kategori Baru</span>
                </Button>

                {/* List Container */}
                <div className="rounded-xl border border-border/60 bg-muted/15 divide-y divide-border/40 overflow-hidden max-h-[300px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      <span className="text-xs">Memuat daftar kategori...</span>
                    </div>
                  ) : expenseCategories.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-muted-foreground">Belum ada kategori belanja.</p>
                    </div>
                  ) : (
                    expenseCategories.map((cat) => {
                      const isLainnya = cat.name.trim().toLowerCase() === "lainnya";
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-2.5 sm:px-3 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
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

                          <div className="flex items-center gap-1 shrink-0">
                            {isLainnya ? (
                              <span className="text-[11px] text-muted-foreground/60 italic px-2 py-0.5 select-none">
                                Terkunci
                              </span>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingCategory(cat);
                                    setEditName(cat.name);
                                    setEditColor(cat.color || COLOR_PRESETS[0]);
                                    setFormError(null);
                                    setView("edit");
                                  }}
                                  title={`Ubah ${cat.name}`}
                                  className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setCategoryToDelete(cat)}
                                  title={`Hapus ${cat.name}`}
                                  className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <DialogFooter className="mt-2 pt-3.5 border-t border-border/40 flex flex-col gap-2 sm:flex-col sm:space-x-0 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="w-full h-9 text-xs cursor-pointer"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* VIEW: TAMBAH KATEGORI BARU */}
          {view === "add" && (
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <DialogHeader className="space-y-1 pb-3 border-b border-border/40 text-left">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Plus className="size-3.5" />
                    </div>
                    <DialogTitle className="text-base font-semibold tracking-tight">
                      Tambah Kategori Baru
                    </DialogTitle>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md shrink-0">
                    <span>Tanpa Target</span>
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground pt-0.5">
                  Buat kategori anggaran baru. Nominal pagu bulanan dapat diatur di tab Atur Pagu.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 pt-1">
                {/* Nama Kategori */}
                <div className="space-y-1.5">
                  <Label htmlFor="addCategoryNameInput" className="text-xs font-medium text-foreground">
                    Nama Kategori
                  </Label>
                  <Input
                    id="addCategoryNameInput"
                    value={addName}
                    onChange={(e) => {
                      setAddName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="Misal: Hobi & Buku, Donasi, Perawatan"
                    className="h-9 text-xs bg-background/50 border-border/60 focus:border-primary/80"
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                {/* Warna Label (24 Pilihan Warna) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Warna Label</Label>
                  <div className="flex items-center gap-2.5 flex-wrap py-1">
                    {COLOR_PRESETS.map((col) => {
                      const isSelected = addColor === col;
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setAddColor(col)}
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

                {formError && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-2 pt-3.5 border-t border-border/40 flex flex-col gap-2 sm:flex-col sm:space-x-0 w-full">
                <Button
                  type="submit"
                  disabled={isSubmitting || !addName.trim()}
                  className="w-full h-9 text-xs font-semibold cursor-pointer gap-1.5"
                >
                  {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{isSubmitting ? "Menyimpan..." : "Tambah Kategori"}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormError(null);
                    setView("list");
                  }}
                  disabled={isSubmitting}
                  className="w-full h-9 text-xs cursor-pointer"
                >
                  Kembali ke Daftar
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* VIEW: EDIT KATEGORI */}
          {view === "edit" && editingCategory && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <DialogHeader className="space-y-1 pb-3 border-b border-border/40 text-left">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Pencil className="size-3.5" />
                    </div>
                    <DialogTitle className="text-base font-semibold tracking-tight">
                      Ubah Kategori
                    </DialogTitle>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md shrink-0">
                    <span>Kategori Belanja</span>
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground pt-0.5">
                  Ubah nama dan warna label kategori belanja yang dipilih.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 pt-1">
                {/* Nama Kategori */}
                <div className="space-y-1.5">
                  <Label htmlFor="editCategoryNameInput" className="text-xs font-medium text-foreground">
                    Nama Kategori
                  </Label>
                  <Input
                    id="editCategoryNameInput"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="Nama kategori"
                    className="h-9 text-xs bg-background/50 border-border/60 focus:border-primary/80"
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>

                {/* Warna Label (24 Pilihan Warna) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Warna Label</Label>
                  <div className="flex items-center gap-2.5 flex-wrap py-1">
                    {COLOR_PRESETS.map((col) => {
                      const isSelected = editColor === col;
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setEditColor(col)}
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

                {formError && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-2 pt-3.5 border-t border-border/40 flex flex-col gap-2 sm:flex-col sm:space-x-0 w-full">
                <Button
                  type="submit"
                  disabled={isSubmitting || !editName.trim()}
                  className="w-full h-9 text-xs font-semibold cursor-pointer gap-1.5"
                >
                  {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormError(null);
                    setView("list");
                  }}
                  disabled={isSubmitting}
                  className="w-full h-9 text-xs cursor-pointer"
                >
                  Kembali ke Daftar
                </Button>
              </DialogFooter>
            </form>
          )}
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
