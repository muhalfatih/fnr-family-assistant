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
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, UploadCloud, FileCheck } from "lucide-react";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      setSelectedFile(null);
    } else {
      setTitle("");
      setCategory("identity");
      setDocumentNumber("");
      setHasExpiry(true);
      setExpiryDate("");
      setReminderDays("30");
      setDriveUrl("");
      setSelectedFile(null);
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
      let finalDriveUrl = driveUrl.trim() || null;
      let finalFileId = documentToEdit?.drive_file_id || null;

      // Direct file upload to Cloudflare R2
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("category", category);

        const uploadRes = await fetch("/api/vault/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadErr = await uploadRes.json();
          throw new Error(uploadErr.error || "Gagal mengunggah berkas dokumen");
        }

        const uploadData = await uploadRes.json();
        finalFileId = uploadData.key;
        finalDriveUrl = uploadData.key;
      }

      const payload = {
        id: documentToEdit?.id,
        title: title.trim(),
        category,
        document_number: documentNumber.trim() || null,
        expiry_date: hasExpiry && expiryDate ? expiryDate : null,
        reminder_days_before: Number(reminderDays) || 30,
        drive_file_id: finalFileId,
        drive_view_url: finalDriveUrl,
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
      <DialogContent className="sm:max-w-[500px] w-full max-w-[95vw] sm:max-w-[500px] max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-xl">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-base sm:text-lg font-bold">
            {documentToEdit ? "Edit Dokumen" : "Tambah Dokumen ke Brankas"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Simpan data arsip penting keluarga dan atur pengingat tanggal jatuh tempo otomatis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {errorMsg && (
            <div className="p-3 text-xs rounded-lg bg-destructive/15 text-destructive border border-destructive/20">
              {errorMsg}
            </div>
          )}

          {/* 1. Nama Dokumen */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold text-foreground">
              Nama Dokumen <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Contoh: STNK Honda HR-V / KTP Ayah"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs sm:text-sm h-10 sm:h-9 rounded-lg"
              required
            />
          </div>

          {/* 2. Kategori & Nomor Dokumen (Single col on mobile, 2 col on sm+) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Kategori <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 sm:h-9 text-xs sm:text-sm w-full rounded-lg">
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

            <div className="space-y-1.5">
              <Label htmlFor="docNumber" className="text-xs font-semibold text-foreground">
                Nomor Dokumen
              </Label>
              <Input
                id="docNumber"
                placeholder="Contoh: B 1234 XYZ / NIK"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="text-xs sm:text-sm tabular-nums h-10 sm:h-9 rounded-lg"
              />
            </div>
          </div>

          {/* 3. Masa Berlaku Switch & Tanggal */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">Memiliki Masa Berlaku?</span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasExpiry"
                  checked={hasExpiry}
                  onChange={(e) => setHasExpiry(e.target.checked)}
                  className="rounded size-4.5 accent-primary text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="hasExpiry" className="text-xs text-muted-foreground cursor-pointer select-none">
                  {hasExpiry ? "Ada batas waktu" : "Seumur hidup / Permanen"}
                </label>
              </div>
            </div>

            {hasExpiry && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                <div className="space-y-1.5">
                  <Label htmlFor="expiryDate" className="text-xs font-semibold text-foreground">
                    Tanggal Kedaluwarsa <span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <DatePicker
                    value={expiryDate}
                    onChange={setExpiryDate}
                    placeholder="Pilih tanggal"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Ingatkan Sebelum
                  </Label>
                  <Select value={reminderDays} onValueChange={setReminderDays}>
                    <SelectTrigger className="h-10 sm:h-9 text-xs sm:text-sm w-full rounded-lg">
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

          {/* 4. Unggah Berkas Fisik (Cloudflare R2) */}
          <div className="space-y-1.5 pt-1">
            <Label htmlFor="docFile" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <UploadCloud className="size-4 text-primary" aria-hidden="true" />
              <span>Unggah Berkas Dokumen (PDF / Foto Dokumen)</span>
            </Label>
            <Input
              id="docFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);
              }}
              className="text-xs file:text-xs file:h-8 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:font-medium h-10 sm:h-9 rounded-lg"
            />
            {selectedFile ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                <FileCheck className="size-3.5" aria-hidden="true" />
                <span>Berkas terpilih: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Berkas disimpan privat dan terenkripsi aman di Cloudflare R2.
              </p>
            )}
          </div>

          {/* Atau Tautan Berkas Eksternal */}
          <div className="space-y-1.5">
            <Label htmlFor="driveUrl" className="text-xs font-medium text-foreground">
              Atau Tautan Berkas Eksternal (Opsional)
            </Label>
            <Input
              id="driveUrl"
              placeholder="https://example.com/dokumen.pdf atau tautan berkas..."
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              className="text-xs h-10 sm:h-9 rounded-lg"
              disabled={!!selectedFile}
            />
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-11 sm:h-9 text-xs px-4 rounded-lg active:scale-98"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto gap-1.5 h-11 sm:h-9 text-xs px-4 rounded-lg shadow-sm active:scale-98"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              <span>{documentToEdit ? "Simpan Perubahan" : "Simpan ke Brankas"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
