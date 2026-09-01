"use client";

import React, { useState, useEffect } from "react";
import { VaultDocument } from "@/app/api/documents/route";
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
import { Loader2 } from "lucide-react";

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  documentToEdit?: VaultDocument | null;
}

export function AddDocumentModal({
  isOpen,
  onClose,
  onSuccess,
  documentToEdit,
}: AddDocumentModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("identity");
  const [documentNumber, setDocumentNumber] = useState("");
  const [hasExpiry, setHasExpiry] = useState(true);
  const [expiryDate, setExpiryDate] = useState("");
  const [reminderDays, setReminderDays] = useState(30);
  const [driveUrl, setDriveUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (documentToEdit) {
      setTitle(documentToEdit.title || "");
      setCategory(documentToEdit.category || "identity");
      setDocumentNumber(documentToEdit.document_number || "");
      setHasExpiry(Boolean(documentToEdit.expiry_date));
      setExpiryDate(documentToEdit.expiry_date || "");
      setReminderDays(documentToEdit.reminder_days_before || 30);
      setDriveUrl(documentToEdit.drive_view_url || "");
    } else {
      setTitle("");
      setCategory("identity");
      setDocumentNumber("");
      setHasExpiry(true);
      setExpiryDate("");
      setReminderDays(30);
      setDriveUrl("");
    }
    setErrorMsg("");
  }, [documentToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Nama dokumen wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        id: documentToEdit?.id,
        title: title.trim(),
        category,
        document_number: documentNumber.trim() || null,
        expiry_date: hasExpiry && expiryDate ? expiryDate : null,
        reminder_days_before: Number(reminderDays) || 30,
        drive_view_url: driveUrl.trim() || null,
      };

      const url = "/api/documents";
      const method = documentToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menyimpan dokumen");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan dokumen");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {documentToEdit ? "Edit Dokumen" : "Tambah Dokumen ke Brankas"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Simpan data arsip penting keluarga dan atur pengingat tanggal jatuh tempo otomatis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/20">
              {errorMsg}
            </div>
          )}

          {/* 1. Nama Dokumen */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs">
              Nama Dokumen <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Contoh: STNK Honda HR-V / KTP Ayah"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          {/* 2. Kategori Dokumen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs">
                Kategori
              </Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-md border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="identity">Identitas (KTP, Paspor, KK)</option>
                <option value="vehicle">Kendaraan (STNK, BPKB, SIM)</option>
                <option value="property">Properti (SHM, PBB, HGB)</option>
                <option value="insurance">Asuransi (Jiwa, Mobil)</option>
                <option value="health">Kesehatan (BPJS, Medis)</option>
                <option value="tax">Pajak (NPWP, SPT)</option>
                <option value="other">Lain-lain (Ijazah, Kontrak)</option>
              </select>
            </div>

            {/* 3. Nomor Dokumen */}
            <div className="space-y-1.5">
              <Label htmlFor="docNumber" className="text-xs">
                Nomor Dokumen
              </Label>
              <Input
                id="docNumber"
                placeholder="Contoh: B 1234 XYZ / NIK"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          {/* 4. Masa Berlaku Switch & Tanggal */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Memiliki Masa Berlaku?</span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasExpiry"
                  checked={hasExpiry}
                  onChange={(e) => setHasExpiry(e.target.checked)}
                  className="rounded size-4 text-primary focus:ring-primary"
                />
                <label htmlFor="hasExpiry" className="text-xs text-muted-foreground cursor-pointer">
                  {hasExpiry ? "Ada batas waktu" : "Seumur hidup / Permanen"}
                </label>
              </div>
            </div>

            {hasExpiry && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label htmlFor="expiryDate" className="text-xs">
                    Tanggal Kedaluwarsa
                  </Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="text-xs"
                    required={hasExpiry}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reminderDays" className="text-xs">
                    Ingatkan Sebelum
                  </Label>
                  <select
                    id="reminderDays"
                    value={reminderDays}
                    onChange={(e) => setReminderDays(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-md border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value={7}>7 Hari Sebelumnya</option>
                    <option value={14}>14 Hari Sebelumnya</option>
                    <option value={30}>30 Hari Sebelumnya (Standar)</option>
                    <option value={60}>60 Hari Sebelumnya</option>
                    <option value={90}>90 Hari Sebelumnya</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 5. Tautan Salinan Google Drive */}
          <div className="space-y-1.5">
            <Label htmlFor="driveUrl" className="text-xs">
              Tautan Berkas Google Drive / Cloud Link (Opsional)
            </Label>
            <Input
              id="driveUrl"
              placeholder="https://drive.google.com/file/d/..."
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              <span>{documentToEdit ? "Simpan Perubahan" : "Simpan ke Brankas"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
