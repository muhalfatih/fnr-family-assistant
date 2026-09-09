"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldAlert,
  KeyRound,
  Send,
  MessageSquare,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UnlockKeysDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (remainingSeconds: number) => void;
}

export function UnlockKeysDialog({
  isOpen,
  onClose,
  onSuccess,
}: UnlockKeysDialogProps) {
  const [activeTab, setActiveTab] = useState<"password" | "telegram" | "whatsapp">("password");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpSentTarget, setOtpSentTarget] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setOtpCode("");
      setErrorMessage(null);
      setOtpSentTarget(null);
      setCooldown(0);
    }
  }, [isOpen]);

  const handleRequestOtp = async (channel: "telegram" | "whatsapp") => {
    setIsRequestingOtp(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/settings/keys/unlock/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal mengirim kode verifikasi.");
      }

      setOtpSentTarget(data.targetDisplay || channel);
      setCooldown(60);
      toast.success(data.message || `Kode verifikasi telah dikirim ke ${channel}.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal meminta kode verifikasi.");
      toast.error(err.message || "Terjadi kesalahan.");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage("Silakan masukkan kata sandi akun Anda.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/settings/keys/unlock/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "password", password: password.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Kata sandi salah.");
      }

      toast.success(data.message || "Verifikasi berhasil! Kunci API terbuka.");
      onSuccess(data.remainingSeconds || 300);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Verifikasi gagal.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent, channel: "telegram" | "whatsapp") => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setErrorMessage("Silakan masukkan kode verifikasi yang Anda terima.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/settings/keys/unlock/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "otp", code: otpCode.trim(), channel }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Kode verifikasi salah atau telah kedaluwarsa.");
      }

      toast.success(data.message || "Verifikasi berhasil! Kunci API terbuka.");
      onSuccess(data.remainingSeconds || 300);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Verifikasi kode gagal.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] w-[95vw] p-5 sm:p-6 flex flex-col gap-4">
        <DialogHeader className="gap-1.5 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldAlert className="size-4" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Verifikasi Keamanan
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Untuk melindungi keamanan kredensial keluarga, lakukan verifikasi identitas sebelum melihat nilai kunci API asli.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-2.5 rounded-md text-xs flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/20 animate-in fade-in">
            <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as any);
            setErrorMessage(null);
            setOtpCode("");
          }}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 w-full h-9 p-1">
            <TabsTrigger value="password" className="text-xs gap-1.5 py-1">
              <KeyRound className="size-3.5" aria-hidden="true" />
              <span>Password</span>
            </TabsTrigger>
            <TabsTrigger value="telegram" className="text-xs gap-1.5 py-1">
              <Send className="size-3.5 text-sky-500" aria-hidden="true" />
              <span>Telegram</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs gap-1.5 py-1">
              <MessageSquare className="size-3.5 text-emerald-500" aria-hidden="true" />
              <span>WhatsApp</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PASSWORD */}
          <TabsContent value="password" className="mt-3 flex flex-col gap-3">
            <form onSubmit={handleVerifyPassword} className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unlock-password" className="text-xs font-medium text-foreground">
                  Kata Sandi Akun
                </Label>
                <div className="relative">
                  <Input
                    id="unlock-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan kata sandi login Anda..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    className="text-xs h-9 pr-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-7 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isVerifying}
                  className="text-xs h-8"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isVerifying || !password.trim()}
                  className="text-xs h-8 gap-1.5"
                >
                  {isVerifying ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                  <span>Buka Akses Kunci</span>
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* TAB 2: TELEGRAM OTP */}
          <TabsContent value="telegram" className="mt-3 flex flex-col gap-3">
            <form onSubmit={(e) => handleVerifyOtp(e, "telegram")} className="flex flex-col gap-3">
              <div className="p-2.5 rounded-md bg-muted/40 border border-border/60 text-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Kirim ke Telegram:</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRequestOtp("telegram")}
                    disabled={isRequestingOtp || cooldown > 0}
                    className="h-7 text-xs gap-1 px-2.5"
                  >
                    {isRequestingOtp ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Send className="size-3 text-sky-500" />
                    )}
                    <span>
                      {cooldown > 0
                        ? `Kirim Ulang (${cooldown}s)`
                        : otpSentTarget
                        ? "Kirim Ulang Kode"
                        : "Minta Kode OTP"}
                    </span>
                  </Button>
                </div>
                {otpSentTarget && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="size-3 shrink-0" />
                    <span>Kode telah dikirim ke {otpSentTarget}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unlock-tg-code" className="text-xs font-medium text-foreground">
                  Kode Verifikasi (6-Digit)
                </Label>
                <Input
                  id="unlock-tg-code"
                  type="text"
                  maxLength={6}
                  placeholder="Contoh: 849201"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center font-mono tracking-widest text-sm h-10 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isVerifying}
                  className="text-xs h-8"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isVerifying || otpCode.trim().length < 4}
                  className="text-xs h-8 gap-1.5"
                >
                  {isVerifying ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                  <span>Verifikasi Kode</span>
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* TAB 3: WHATSAPP OTP */}
          <TabsContent value="whatsapp" className="mt-3 flex flex-col gap-3">
            <form onSubmit={(e) => handleVerifyOtp(e, "whatsapp")} className="flex flex-col gap-3">
              <div className="p-2.5 rounded-md bg-muted/40 border border-border/60 text-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground font-medium">Kirim ke WhatsApp:</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRequestOtp("whatsapp")}
                    disabled={isRequestingOtp || cooldown > 0}
                    className="h-7 text-xs gap-1 px-2.5"
                  >
                    {isRequestingOtp ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <MessageSquare className="size-3 text-emerald-500" />
                    )}
                    <span>
                      {cooldown > 0
                        ? `Kirim Ulang (${cooldown}s)`
                        : otpSentTarget
                        ? "Kirim Ulang Kode"
                        : "Minta Kode OTP"}
                    </span>
                  </Button>
                </div>
                {otpSentTarget && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="size-3 shrink-0" />
                    <span>Kode telah dikirim ke {otpSentTarget}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unlock-wa-code" className="text-xs font-medium text-foreground">
                  Kode Verifikasi (6-Digit)
                </Label>
                <Input
                  id="unlock-wa-code"
                  type="text"
                  maxLength={6}
                  placeholder="Contoh: 593021"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center font-mono tracking-widest text-sm h-10 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isVerifying}
                  className="text-xs h-8"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isVerifying || otpCode.trim().length < 4}
                  className="text-xs h-8 gap-1.5"
                >
                  {isVerifying ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                  <span>Verifikasi Kode</span>
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
