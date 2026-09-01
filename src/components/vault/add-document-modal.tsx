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
  const [reminderDays, setReminderDays] = useState("30");
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
      setReminderDays(String(documentToEdit.reminder_days_before || 30));
      setDriveUrl(documentToEdit.drive_view_url || "");
    } else {
      setTitle("");
      setCategory("identity");
      setDocumentNumber("");
      setHasExpiry(true);
      setExpiryDate("");
      setReminderDays("30");
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {documentToEdit ? "Edit Dokumen" : "Tambah Dokumen ke Brankas"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Simpan data arsip penting keluarga dan atur pengingat tanggal jatuh tempo otomatis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {errorMsg && (
            <div className="p-3 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/20">
              {errorMsg}
            </div>
          )}

          {/* 1. Nama Dokumen */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-medium">
              Nama Dokumen <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Contoh: STNK Honda HR-V / KTP Ayah"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          {/* 2. Kategori Dokumen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Kategori
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="identity">Identitas (KTP, Paspor, KK)</SelectItem>
                    <SelectItem value="vehicle">Kendaraan (STNK, SIM, BPKB)</SelectItem>
                    <SelectItem value="property">Properti (SHM, PBB, HGB)</SelectItem>
                    <SelectItem value="insurance">Asuransi (Jiwa, Mobil)</SelectItem>
                    <SelectItem value="health">Kesehatan (BPJS, Medis)</SelectItem>
                    <SelectItem value="tax">Pajak (NPWP, SPT)</SelectItem>
                    <SelectItem value="other">Lain-lain (Ijazah, Kontrak)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* 3. Nomor Dokumen */}
            <div className="space-y-1.5">
              <Label htmlFor="docNumber" className="text-xs font-medium">
                Nomor Dokumen
              </Label>
              <Input
                id="docNumber"
                placeholder="Contoh: B 1234 XYZ / NIK"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="text-xs font-mono h-9"
              />
            </div>
          </div>

          {/* 4. Masa Berlaku Switch & Tanggal */}
          <div className="p-3.5 rounded-lg border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Memiliki Masa Berlaku?</span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasExpiry"
                  checked={hasExpiry}
                  onChange={(e) => setHasExpiry(e.target.checked)}
                  className="rounded size-4 accent-primary text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="hasExpiry" className="text-xs text-muted-foreground cursor-pointer select-none">
                  {hasExpiry ? "Ada batas waktu" : "Seumur hidup / Permanen"}
                </label>
              </div>
            </div>

            {hasExpiry && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label htmlFor="expiryDate" className="text-xs font-medium">
                    Tanggal Kedaluwarsa
                  </Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="text-xs h-9"
                    required={hasExpiry}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Ingatkan Sebelum
                  </Label>
                  <Select value={reminderDays} onValueChange={setReminderDays}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Waktu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="7">7 Hari Sebelumnya</SelectItem>
                        <SelectItem value="14">14 Hari Sebelumnya</SelectItem>
                        <SelectItem value="30">30 Hari Sebelumnya (Standar)</SelectItem>
                        <SelectItem value="60">60 Hari Sebelumnya</SelectItem>
                        <SelectItem value="90">90 Hari Sebelumnya</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* 5. Tautan Salinan Google Drive */}
          <div className="space-y-1.5">
            <Label htmlFor="driveUrl" className="text-xs font-medium">
              Tautan Berkas Google Drive / Cloud (Opsional)
            </Label>
            <Input
              id="driveUrl"
              placeholder="https://drive.google.com/file/d/..."
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              className="text-xs font-mono h-9"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="h-9 text-xs">
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5 h-9 text-xs">
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              <span>{documentToEdit ? "Simpan Perubahan" : "Simpan ke Brankas"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
