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
import { Loader2, HelpCircle, CheckCircle2, AlertCircle, Search, Send, Lock, Eye, EyeOff, KeyRound } from "lucide-react";

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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    setIsChangingPassword(false);
    setCurrentPassword("");
    setShowCurrentPassword(false);
    setNewPassword("");
    setShowNewPassword(false);
    setConfirmPassword("");
    setShowConfirmPassword(false);
    setTelegramCheckFeedback(null);
    setErrorMsg("");
  }, [memberToEdit, isOpen]);

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let gen = "";
    for (let i = 0; i < 8; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(gen);
    setConfirmPassword(gen);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
    toast.info(`Kata sandi acak dibuat: ${gen}`);
  };

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

    // Password validation if user is changing password or setting one on a new member
    const isEditing = Boolean(memberToEdit);
    const hasExistingPassword = Boolean(memberToEdit?.has_password);

    if (isChangingPassword || (!isEditing && newPassword.trim())) {
      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) {
          setErrorMsg("Kata sandi baru minimal 6 karakter.");
          return;
        }
        if (newPassword.trim() !== confirmPassword.trim()) {
          setErrorMsg("Konfirmasi kata sandi tidak cocok dengan sandi baru.");
          return;
        }
        if (isEditing && hasExistingPassword && !currentPassword.trim()) {
          setErrorMsg("Kata sandi saat ini wajib diisi untuk mengubah kata sandi.");
          return;
        }
      }
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const payload: Record<string, any> = {
        id: memberToEdit?.id,
        full_name: fullName.trim(),
        role,
        default_wallet_id: defaultWalletId || null,
        telegram_chat_id: telegramChatId.trim() ? Number(telegramChatId.trim()) : null,
        telegram_username: telegramUsername.trim() ? telegramUsername.trim().replace(/^@/, "") : null,
        whatsapp_number: whatsappNumber.trim() || null,
      };

      if ((isChangingPassword || !isEditing) && newPassword.trim()) {
        payload.password = newPassword.trim();
        if (isEditing && hasExistingPassword) {
          payload.current_password = currentPassword.trim();
        }
      }

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

      toast.success(
        memberToEdit
          ? (newPassword.trim() ? "Profil dan kata sandi berhasil diperbarui!" : "Profil anggota berhasil diperbarui!")
          : "Anggota keluarga berhasil ditambahkan!"
      );

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
      <DialogContent className="sm:max-w-[440px] w-[95vw] max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {memberToEdit ? "Edit Profil Anggota" : "Tambah Anggota Keluarga"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Atur profil anggota, peran, dompet default, dan keamanan akun.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {errorMsg && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 animate-in fade-in">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Nama Lengkap */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-medium text-foreground">
              Nama Lengkap
            </Label>
            <Input
              id="fullName"
              placeholder="Nama anggota keluarga"
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
                Peran (Role)
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="Pilih Peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="admin">Kepala Keluarga</SelectItem>
                    <SelectItem value="spouse">Pengelola</SelectItem>
                    <SelectItem value="member">Anggota</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Dompet Default
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

          {/* 3. Tautan Akun Telegram */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="tgId" className="text-xs font-medium text-foreground">
                  Telegram Chat ID
                </Label>
                {telegramUsername ? (
                  <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4 gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                    <Send className="size-2.5 text-sky-500" aria-hidden="true" />
                    <span>@{telegramUsername}</span>
                  </Badge>
                ) : telegramChatId ? (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    Terhubung
                  </Badge>
                ) : null}
              </div>
              <span className="text-[10.5px] text-muted-foreground">Opsional</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="tgId"
                type="number"
                placeholder="ID chat numerik"
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
                title="Cek akun Telegram"
              >
                {isCheckingTelegram ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Search className="size-3.5 text-muted-foreground" aria-hidden="true" />
                )}
                <span>Cek Akun</span>
              </Button>
            </div>

            {telegramCheckFeedback ? (
              <p
                className={cn(
                  "text-[11px] flex items-center gap-1.5 mt-0.5",
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
                {telegramUsername
                  ? `Terhubung ke @${telegramUsername}.`
                  : "Dapat diperoleh otomatis dengan mengirim /start ke bot Telegram."}
              </p>
            )}
          </div>

          {/* 4. Nomor WhatsApp */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="wa" className="text-xs font-medium text-foreground">
                Nomor WhatsApp
              </Label>
              <span className="text-[10.5px] text-muted-foreground">Opsional</span>
            </div>
            <Input
              id="wa"
              type="tel"
              placeholder="0812-3456-7890"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="text-xs tabular-nums h-9"
            />
          </div>

          {/* 5. Keamanan Akun & Kata Sandi */}
          <div className="space-y-3 pt-3 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Lock className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  <span>Keamanan &amp; Kata Sandi</span>
                </Label>
                {memberToEdit?.has_password ? (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="size-2.5" aria-hidden="true" />
                    <span>Sandi Aktif</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                    Belum Disetel
                  </Badge>
                )}
              </div>

              {/* Progressive Disclosure Toggle Button */}
              {!isChangingPassword && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsChangingPassword(true);
                    setNewPassword("");
                    setConfirmPassword("");
                    setCurrentPassword("");
                  }}
                  className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer"
                >
                  <KeyRound className="size-3" aria-hidden="true" />
                  <span>{memberToEdit?.has_password ? "Ubah Sandi" : "Setel Sandi"}</span>
                </Button>
              )}
            </div>

            {/* Description when collapsed */}
            {!isChangingPassword && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {memberToEdit?.has_password
                  ? "Anggota dapat login menggunakan kata sandi pribadi ini di tab Sandi."
                  : "Opsional. Anggota dapat masuk menggunakan kata sandi keluarga master jika belum disetel."}
              </p>
            )}

            {/* Expanded Password Form */}
            {isChangingPassword && (
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                  <span className="text-xs font-semibold text-foreground">
                    {memberToEdit?.has_password ? "Ubah Kata Sandi" : "Atur Kata Sandi Baru"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGeneratePassword}
                      className="h-6 px-2 text-[11px] text-primary hover:text-primary/90 gap-1 cursor-pointer"
                      title="Buat kata sandi acak yang aman"
                    >
                      <KeyRound className="size-3" aria-hidden="true" />
                      <span>Acak Sandi</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setErrorMsg("");
                      }}
                      className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Batal
                    </Button>
                  </div>
                </div>

                {/* Field 1: Kata Sandi Saat Ini (Hanya muncul jika member sudah memiliki sandi) */}
                {memberToEdit?.has_password && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="currentPasswordInput" className="text-xs font-medium text-foreground">
                        Kata Sandi Saat Ini <span className="text-destructive">*</span>
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        Lupa? Gunakan sandi master
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <Input
                        id="currentPasswordInput"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          if (errorMsg) setErrorMsg("");
                        }}
                        placeholder="Ketik sandi saat ini atau sandi keluarga"
                        className="h-8 pr-8 text-xs font-mono bg-background"
                        autoComplete="current-password"
                        required={Boolean(isChangingPassword && memberToEdit?.has_password)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2 size-5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                        tabIndex={-1}
                        aria-label={showCurrentPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                      >
                        {showCurrentPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Field 2: Kata Sandi Baru */}
                <div className="space-y-1">
                  <Label htmlFor="newPasswordInput" className="text-xs font-medium text-foreground">
                    Kata Sandi Baru <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <Input
                      id="newPasswordInput"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errorMsg) setErrorMsg("");
                      }}
                      placeholder="Min. 6 karakter"
                      className="h-8 pr-8 text-xs font-mono bg-background"
                      autoComplete="new-password"
                      required={Boolean(isChangingPassword)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 size-5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      tabIndex={-1}
                      aria-label={showNewPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                    >
                      {showNewPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    </button>
                  </div>
                </div>

                {/* Field 3: Konfirmasi Kata Sandi Baru */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="confirmPasswordInput" className="text-xs font-medium text-foreground">
                      Konfirmasi Sandi Baru <span className="text-destructive">*</span>
                    </Label>
                    {newPassword && confirmPassword && (
                      <span
                        className={cn(
                          "text-[10.5px] font-medium flex items-center gap-1",
                          newPassword === confirmPassword
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        )}
                      >
                        {newPassword === confirmPassword ? (
                          <>
                            <CheckCircle2 className="size-3" />
                            <span>Cocok</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="size-3" />
                            <span>Belum cocok</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Input
                      id="confirmPasswordInput"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMsg) setErrorMsg("");
                      }}
                      placeholder="Ulangi kata sandi baru"
                      className="h-8 pr-8 text-xs font-mono bg-background"
                      autoComplete="new-password"
                      required={Boolean(isChangingPassword)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 size-5 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                    >
                      {showConfirmPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
