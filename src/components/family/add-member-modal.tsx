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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, HelpCircle, CheckCircle2, AlertCircle, Search, Send } from "lucide-react";

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
  const [telegramUsername, setTelegramUsername] = useState("");
  const [telegramDisplayName, setTelegramDisplayName] = useState("");
  const [isCheckingTelegram, setIsCheckingTelegram] = useState(false);
  const [telegramCheckFeedback, setTelegramCheckFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (memberToEdit) {
      setFullName(memberToEdit.full_name || "");
      setRole(memberToEdit.role || "member");
      setDefaultWalletId(memberToEdit.default_wallet_id || "");
      setTelegramChatId(memberToEdit.telegram_chat_id ? String(memberToEdit.telegram_chat_id) : "");
      setTelegramUsername(memberToEdit.telegram_username ? memberToEdit.telegram_username.replace(/^@/, "") : "");
      setTelegramDisplayName(memberToEdit.full_name || "");
      setWhatsappNumber(memberToEdit.whatsapp_number || "");
    } else {
      setFullName("");
      setRole("member");
      setDefaultWalletId(wallets && wallets.length > 0 ? wallets[0].id : "");
      setTelegramChatId("");
      setTelegramUsername("");
      setTelegramDisplayName("");
      setWhatsappNumber("");
    }
    setTelegramCheckFeedback(null);
    setErrorMsg("");
  }, [memberToEdit, isOpen]);

  const handleCheckTelegram = async () => {
    const cleanId = telegramChatId.trim();
    if (!cleanId) {
      setTelegramCheckFeedback({
        type: "error",
        message: "Ketik Telegram Chat ID terlebih dahulu untuk memeriksa akun.",
      });
      return;
    }

    setIsCheckingTelegram(true);
    setTelegramCheckFeedback(null);

    try {
      const res = await fetch(`/api/telegram/lookup?chat_id=${encodeURIComponent(cleanId)}`);
      const data = await res.json();

      if (data.ok) {
        const cleanUsername = data.username ? data.username.replace(/^@/, "").trim() : "";
        setTelegramUsername(cleanUsername);

        if (data.displayName) {
          setTelegramDisplayName(data.displayName);
        }

        // Auto-save immediately if editing an existing member
        if (memberToEdit?.id) {
          try {
            const saveRes = await fetch("/api/members", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: memberToEdit.id,
                telegram_chat_id: Number(cleanId),
                telegram_username: cleanUsername || null,
              }),
            });

            if (saveRes.ok) {
              // Update local memberToEdit object reference so if modal re-renders it retains new values
              memberToEdit.telegram_chat_id = Number(cleanId);
              memberToEdit.telegram_username = cleanUsername || null;

              // Revalidate parent SWR cache so members list card updates in background
              onSuccess();

              if (cleanUsername) {
                toast.success(`Akun @${cleanUsername} terverifikasi dan otomatis tersimpan ke profil!`);
              } else {
                toast.success("Akun Telegram terhubung dan otomatis tersimpan ke profil!");
              }
            } else {
              const errData = await saveRes.json().catch(() => ({}));
              console.warn("Gagal menyimpan otomatis username telegram:", errData);
            }
          } catch (autoSaveErr) {
            console.warn("Kesalahan koneksi saat menyimpan akun telegram:", autoSaveErr);
          }
        }

        if (data.hasUsername) {
          setTelegramCheckFeedback({
            type: "success",
            message: memberToEdit?.id
              ? `Akun terverifikasi: @${data.username} (${data.displayName}) — otomatis tersimpan ke profil.`
              : `Akun terverifikasi: @${data.username} (${data.displayName})`,
          });
        } else {
          setTelegramCheckFeedback({
            type: "info",
            message: memberToEdit?.id
              ? `Akun valid (${data.displayName}), namun belum menyetel @username publik di Telegram — otomatis tersimpan ke profil.`
              : `Akun valid (${data.displayName}), namun belum menyetel @username publik di Telegram.`,
          });
        }
      } else {
        setTelegramCheckFeedback({
          type: "error",
          message: data.error || "Akun tidak ditemukan atau bot belum pernah dihubungi.",
        });
      }
    } catch {
      setTelegramCheckFeedback({
        type: "error",
        message: "Gagal terhubung ke layanan verifikasi Telegram.",
      });
    } finally {
      setIsCheckingTelegram(false);
    }
  };

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
        telegram_username: telegramUsername.trim() ? telegramUsername.trim().replace(/^@/, "") : null,
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
      <DialogContent className="sm:max-w-[480px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {memberToEdit ? "Edit Profil Anggota" : "Tambah Anggota Keluarga"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Kelola profil anggota keluarga, dompet pengeluaran default, dan tautan akun bot Telegram.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {errorMsg && (
            <div className="p-3 text-xs rounded-md bg-destructive/15 text-destructive border border-destructive/20">
              {errorMsg}
            </div>
          )}

          {/* 1. Nama Lengkap */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-medium text-foreground">
              Nama Lengkap <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="Contoh: Ayah / Ibu / Sulung"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          {/* 2. Role dan Dompet Default */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Peran (Role) <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="Pilih Peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="admin">Kepala Keluarga (Akses Penuh)</SelectItem>
                    <SelectItem value="spouse">Pengelola (Keuangan, Aset, Brankas)</SelectItem>
                    <SelectItem value="member">Anggota (Keuangan & Catat)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Dompet Default <span className="text-destructive ml-0.5">*</span>
              </Label>
              <Select value={defaultWalletId} onValueChange={setDefaultWalletId}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="Pilih Dompet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {wallets.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3. Tautan Telegram Chat ID & Cek Akun */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="tgId" className="text-xs font-medium text-foreground">
                Telegram Chat ID (Opsional)
              </Label>
              <span
                className="text-[11px] text-muted-foreground flex items-center gap-1"
                title="Untuk mendapatkan Chat ID, kirim /start ke bot @fnr_assistant_bot"
              >
                <HelpCircle className="size-3" aria-hidden="true" />
                <span>Otomatis terisi jika kirim /start</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="tgId"
                type="number"
                placeholder="Contoh: 123456789"
                value={telegramChatId}
                onChange={(e) => {
                  setTelegramChatId(e.target.value);
                  if (telegramCheckFeedback) setTelegramCheckFeedback(null);
                }}
                className="text-xs tabular-nums h-9 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCheckTelegram}
                disabled={isCheckingTelegram || !telegramChatId.trim()}
                className="h-9 text-xs px-3 shrink-0 gap-1.5 cursor-pointer"
                title="Verifikasi Chat ID dan ambil data akun Telegram"
              >
                {isCheckingTelegram ? (
                  <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" aria-hidden="true" />
                ) : (
                  <Search className="size-3.5 text-muted-foreground" data-icon="inline-start" aria-hidden="true" />
                )}
                <span>Cek Akun</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              ID numerik Telegram. Klik <b>Cek Akun</b> untuk memverifikasi dan mengambil username secara otomatis.
            </p>
          </div>

          {/* 4. Username Telegram (View Only) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              Username Telegram (Otomatis dari Akun)
            </Label>
            <div className="flex items-center justify-between min-h-9 px-3 py-1.5 rounded-md border border-input bg-muted/40 text-xs transition-colors">
              <div className="flex items-center gap-2 truncate">
                <Send className="size-3.5 text-sky-600 shrink-0" aria-hidden="true" />
                {telegramUsername ? (
                  <span className="font-semibold text-foreground tracking-tight">
                    @{telegramUsername}
                  </span>
                ) : telegramDisplayName && telegramChatId ? (
                  <span className="text-muted-foreground text-xs font-medium truncate">
                    Terhubung (Tanpa @username) • Nama: {telegramDisplayName}
                  </span>
                ) : (
                  <span className="text-muted-foreground/75 italic text-xs">
                    Otomatis terdeteksi saat ID terdaftar / akun terhubung
                  </span>
                )}
              </div>

              {telegramUsername ? (
                <Badge variant="success" className="text-[10px] px-2 py-0 h-5 shrink-0 gap-1">
                  <CheckCircle2 className="size-2.5" aria-hidden="true" />
                  <span>Terverifikasi</span>
                </Badge>
              ) : telegramChatId ? (
                <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 shrink-0">
                  ID Terdaftar
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 text-muted-foreground shrink-0">
                  Belum Terhubung
                </Badge>
              )}
            </div>

            {telegramCheckFeedback ? (
              <p
                className={cn(
                  "text-[11px] flex items-center gap-1.5 mt-1",
                  telegramCheckFeedback.type === "success"
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : telegramCheckFeedback.type === "info"
                    ? "text-amber-600 dark:text-amber-400 font-medium"
                    : "text-destructive"
                )}
              >
                {telegramCheckFeedback.type === "success" ? (
                  <CheckCircle2 className="size-3 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
                )}
                <span>{telegramCheckFeedback.message}</span>
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Username disinkronkan otomatis dari Telegram ketika akun terhubung. Tidak perlu diinput manual.
              </p>
            )}
          </div>

          {/* 4. Nomor WhatsApp */}
          <div className="space-y-1.5">
            <Label htmlFor="wa" className="text-xs font-medium text-foreground">
              Nomor WhatsApp (Opsional)
            </Label>
            <Input
              id="wa"
              placeholder="Contoh: +6281234567890"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="text-xs tabular-nums h-9"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto h-9 text-xs px-3 cursor-pointer">
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="w-full sm:w-auto gap-1.5 h-9 text-xs px-3 cursor-pointer">
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              <span>{memberToEdit ? "Simpan Perubahan" : "Tambah Anggota"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
