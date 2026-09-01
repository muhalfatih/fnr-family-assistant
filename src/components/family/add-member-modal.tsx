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
import { Loader2, HelpCircle } from "lucide-react";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  memberToEdit?: any | null;
  wallets: any[];
}

export function AddMemberModal({
  isOpen,
  onClose,
  onSuccess,
  memberToEdit,
  wallets,
}: AddMemberModalProps) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("member");
  const [defaultWalletId, setDefaultWalletId] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (memberToEdit) {
      setFullName(memberToEdit.full_name || "");
      setRole(memberToEdit.role || "member");
      setDefaultWalletId(memberToEdit.default_wallet_id || "");
      setTelegramChatId(memberToEdit.telegram_chat_id ? String(memberToEdit.telegram_chat_id) : "");
      setWhatsappNumber(memberToEdit.whatsapp_number || "");
    } else {
      setFullName("");
      setRole("member");
      setDefaultWalletId(wallets && wallets.length > 0 ? wallets[0].id : "");
      setTelegramChatId("");
      setWhatsappNumber("");
    }
    setErrorMsg("");
  }, [memberToEdit, isOpen, wallets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg("Nama anggota wajib diisi");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const payload = {
        id: memberToEdit?.id,
        full_name: fullName.trim(),
        role,
        default_wallet_id: defaultWalletId || null,
        telegram_chat_id: telegramChatId.trim() ? Number(telegramChatId.trim()) : null,
        whatsapp_number: whatsappNumber.trim() || null,
      };

      const url = "/api/members";
      const method = memberToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menyimpan data anggota");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan anggota");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {memberToEdit ? "Edit Profil Anggota" : "Tambah Anggota Keluarga"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Kelola profil anggota keluarga, dompet pengeluaran default, dan tautan akun bot Telegram.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/20">
              {errorMsg}
            </div>
          )}

          {/* 1. Nama Lengkap */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs">
              Nama Lengkap <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="Contoh: Ayah / Ibu / Sulung"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          {/* 2. Role dan Dompet Default */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs">
                Peran (Role)
              </Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-9 px-3 rounded-md border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="admin">Admin (Pengelola Penuh)</option>
                <option value="member">Anggota (Pencatat)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wallet" className="text-xs">
                Dompet Pengeluaran Default
              </Label>
              <select
                id="wallet"
                value={defaultWalletId}
                onChange={(e) => setDefaultWalletId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">-- Pilih Rekening --</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Tautan Telegram Chat ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="tgId" className="text-xs">
                Telegram Chat ID (Opsional)
              </Label>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1" title="Untuk mendapatkan Chat ID, kirim /start ke bot @fnr_assistant_bot">
                <HelpCircle className="size-3" aria-hidden="true" />
                <span>Ketik /start di bot</span>
              </span>
            </div>
            <Input
              id="tgId"
              type="number"
              placeholder="Contoh: 123456789"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              className="text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Jika diisi, semua transaksi foto struk / chat yang dikirim nomor Telegram ini akan otomatis diatribusikan ke anggota ini.
            </p>
          </div>

          {/* 4. Nomor WhatsApp */}
          <div className="space-y-1.5">
            <Label htmlFor="wa" className="text-xs">
              Nomor WhatsApp (Opsional)
            </Label>
            <Input
              id="wa"
              placeholder="Contoh: +6281234567890"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              <span>{memberToEdit ? "Simpan Perubahan" : "Tambah Anggota"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
