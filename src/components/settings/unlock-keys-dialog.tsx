"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronLeft,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UnlockKeysDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (remainingSeconds: number) => void;
}

interface SecurityChannelInfo {
  available: boolean;
  targetDisplay?: string | null;
}

interface SecurityChannels {
  telegram: SecurityChannelInfo;
  whatsapp: SecurityChannelInfo;
  password: { available: boolean };
}

export function UnlockKeysDialog({
  isOpen,
  onClose,
  onSuccess,
}: UnlockKeysDialogProps) {
  const [view, setView] = useState<"select_channel" | "input_otp" | "input_password">("select_channel");
  const [channels, setChannels] = useState<SecurityChannels>({
    telegram: { available: false },
    whatsapp: { available: false },
    password: { available: true },
  });
  const [activeChannel, setActiveChannel] = useState<"telegram" | "whatsapp">("telegram");
  const [targetDisplay, setTargetDisplay] = useState<string>("");

  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Countdown timer for OTP resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Fetch active channels whenever the dialog opens
  useEffect(() => {
    if (!isOpen) {
      setOtpCode("");
      setPassword("");
      setErrorMessage(null);
      setCooldown(0);
      return;
    }

    let isMounted = true;
    setIsLoadingOptions(true);
    setErrorMessage(null);

    const loadOptions = async () => {
      try {
        const res = await fetch("/api/settings/keys/unlock/options");
        if (!res.ok) {
          throw new Error("Gagal memeriksa opsi keamanan akun.");
        }
        const data = await res.json();
        if (isMounted && data.ok) {
          setChannels(data.channels);
          if (!data.hasAnyChatChannel) {
            setView("input_password");
          } else {
            setView("select_channel");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          // Fallback to password view
          setView("input_password");
        }
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false);
        }
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Focus OTP input when transitioning to input_otp
  useEffect(() => {
    if (view === "input_otp") {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 100);
    }
  }, [view]);

  // Send OTP handler (1-click from card or resend)
  const handleSendOtp = async (channel: "telegram" | "whatsapp") => {
    setIsSendingOtp(true);
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

      setActiveChannel(channel);
      setTargetDisplay(data.targetDisplay || (channel === "telegram" ? "Telegram" : "WhatsApp"));
      setCooldown(60);
      setView("input_otp");
      toast.success(data.message || `Kode verifikasi telah dikirim ke ${channel}.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengirim kode verifikasi.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setErrorMessage("Silakan masukkan kode 6-digit yang Anda terima.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/settings/keys/unlock/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "otp",
          code: otpCode.trim(),
          channel: activeChannel,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Kode verifikasi salah atau telah kedaluwarsa.");
      }

      toast.success(data.message || "Verifikasi berhasil! Akses kunci terbuka.");
      onSuccess(data.remainingSeconds || 300);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Verifikasi gagal.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Verify Password
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
        throw new Error(data.error || "Kata sandi yang Anda masukkan salah.");
      }

      toast.success(data.message || "Verifikasi berhasil! Akses kunci terbuka.");
      onSuccess(data.remainingSeconds || 300);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Verifikasi gagal.");
    } finally {
      setIsVerifying(false);
    }
  };

  const hasAnyChatChannel = channels.telegram.available || channels.whatsapp.available;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] w-[95vw] p-5 sm:p-6 flex flex-col gap-4">
        <DialogHeader className="gap-1.5 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
              <ShieldAlert className="size-4" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {view === "input_otp"
                  ? "Masukkan Kode Verifikasi"
                  : view === "input_password"
                  ? "Verifikasi Kata Sandi"
                  : "Verifikasi Keamanan"}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {view === "input_otp"
              ? `Kode verifikasi 6-digit telah dikirim ke ${activeChannel === "telegram" ? "Telegram" : "WhatsApp"} (${targetDisplay}). Berlaku 5 menit.`
              : view === "input_password"
              ? "Masukkan kata sandi akun Anda untuk membuka akses tampilan kunci API."
              : "Pilih kanal terdaftar untuk menerima kode verifikasi sementara."}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-2.5 rounded-md text-xs flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/20 animate-in fade-in">
            <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* LOADING OPTIONS SKELETON */}
        {isLoadingOptions ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2.5 text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-xs">Memeriksa autentikasi akun...</span>
          </div>
        ) : (
          <>
            {/* VIEW 1: SELECT CHANNEL (1-CLICK CARDS) */}
            {view === "select_channel" && (
              <div className="flex flex-col gap-2.5">
                {channels.telegram.available && (
                  <button
                    type="button"
                    onClick={() => handleSendOtp("telegram")}
                    disabled={isSendingOtp}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-card hover:bg-sky-500/10 hover:border-sky-500/40 text-left transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 items-center justify-center rounded-md bg-sky-500/10 text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors shrink-0">
                        <Send className="size-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="text-xs font-semibold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400">
                          Kirim Kode ke Telegram
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Akun: {channels.telegram.targetDisplay || "Telegram Bot"}
                        </p>
                      </div>
                    </div>
                    {isSendingOtp && activeChannel === "telegram" ? (
                      <Loader2 className="size-4 animate-spin text-sky-500 shrink-0" />
                    ) : (
                      <ArrowRight className="size-4 text-muted-foreground group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    )}
                  </button>
                )}

                {channels.whatsapp.available && (
                  <button
                    type="button"
                    onClick={() => handleSendOtp("whatsapp")}
                    disabled={isSendingOtp}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-card hover:bg-emerald-500/10 hover:border-emerald-500/40 text-left transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                        <MessageSquare className="size-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="text-xs font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          Kirim Kode ke WhatsApp
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Nomor: {channels.whatsapp.targetDisplay || "Nomor Terdaftar"}
                        </p>
                      </div>
                    </div>
                    {isSendingOtp && activeChannel === "whatsapp" ? (
                      <Loader2 className="size-4 animate-spin text-emerald-500 shrink-0" />
                    ) : (
                      <ArrowRight className="size-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    )}
                  </button>
                )}

                {/* Password Fallback Link */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setView("input_password");
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground hover:underline transition-colors cursor-pointer"
                  >
                    Atau gunakan kata sandi akun
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-7 text-xs"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {/* VIEW 2: INPUT OTP */}
            {view === "input_otp" && (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="unlock-otp-code" className="text-xs font-medium text-foreground">
                      Kode Verifikasi (6-Digit)
                    </Label>
                    <button
                      type="button"
                      onClick={() => handleSendOtp(activeChannel)}
                      disabled={isSendingOtp || cooldown > 0}
                      className="text-[11px] text-primary hover:underline disabled:text-muted-foreground disabled:no-underline transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="size-3" />
                      <span>{cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : "Kirim Ulang"}</span>
                    </button>
                  </div>
                  <Input
                    ref={otpInputRef}
                    id="unlock-otp-code"
                    type="text"
                    maxLength={6}
                    placeholder="Contoh: 849201"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center font-mono tracking-widest text-base h-11 font-bold select-all"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                  {hasAnyChatChannel ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setErrorMessage(null);
                        setOtpCode("");
                        setView("select_channel");
                      }}
                      className="text-xs h-8 gap-1 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <ChevronLeft className="size-3.5" />
                      <span>Ganti Metode</span>
                    </Button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onClose}
                      disabled={isVerifying}
                      className="text-xs h-8 cursor-pointer"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isVerifying || otpCode.trim().length < 4}
                      className="text-xs h-8 gap-1.5 cursor-pointer"
                    >
                      {isVerifying ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Lock className="size-3.5" />
                      )}
                      <span>Verifikasi</span>
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* VIEW 3: INPUT PASSWORD */}
            {view === "input_password" && (
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

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                  {hasAnyChatChannel ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setErrorMessage(null);
                        setPassword("");
                        setView("select_channel");
                      }}
                      className="text-xs h-8 gap-1 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <ChevronLeft className="size-3.5" />
                      <span>Kirim Kode OTP</span>
                    </Button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onClose}
                      disabled={isVerifying}
                      className="text-xs h-8 cursor-pointer"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isVerifying || !password.trim()}
                      className="text-xs h-8 gap-1.5 cursor-pointer"
                    >
                      {isVerifying ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Lock className="size-3.5" />
                      )}
                      <span>Buka Kunci</span>
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
