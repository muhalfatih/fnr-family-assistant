"use client";

import React, { useState } from "react";
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
import { Sparkles, Check, Loader2 } from "lucide-react";

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

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddCategoryModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nama kategori wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color,
          type: "expense",
          initialTarget: 0,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menambahkan kategori");
      }

      setName("");
      setColor(COLOR_PRESETS[0]);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan kategori");
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
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="size-4" />
              </div>
              <DialogTitle className="text-base font-semibold tracking-tight">
                Tambah Kategori Anggaran
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-0.5">
              Kategori baru ini akan otomatis tersedia di seluruh periode pengeluaran keluarga.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-1">
            {/* Nama Kategori */}
            <div className="space-y-1.5">
              <Label htmlFor="addCategoryName" className="text-xs font-medium text-foreground">
                Nama Kategori
              </Label>
              <Input
                id="addCategoryName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Misal: Hobi & Buku, Skincare, Kursus"
                className="h-9 text-xs bg-background/50 border-border/60 focus:border-primary/80"
                disabled={isSubmitting}
                autoFocus
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
              <span>{isSubmitting ? "Menyimpan..." : "Simpan Kategori"}</span>
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
