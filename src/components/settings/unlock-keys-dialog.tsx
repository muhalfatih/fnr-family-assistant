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
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UnlockKeysDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (remainingSeconds: number, keys?: Record<string, string>) => void;
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

  // 6-digit segmented OTP slots
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Simulation hint for testing environments
  const [simulationHint, setSimulationHint] = useState<{
    code?: string;
    note?: string;
  } | null>(null);

  // Password authentication
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setOtpDigits(["", "", "", "", "", ""]);
      setPassword("");
      setErrorMessage(null);
      setSimulationHint(null);
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

  // Focus the first empty digit box when transitioning to input_otp
  useEffect(() => {
    if (view === "input_otp") {
      setTimeout(() => {
        digitRefs.current[0]?.focus();
      }, 150);
    }
  }, [view]);

  // Send OTP handler (1-click from card or resend)
  const handleSendOtp = async (channel: "telegram" | "whatsapp") => {
    setIsSendingOtp(true);
    setErrorMessage(null);
    setSimulationHint(null);
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
      setOtpDigits(["", "", "", "", "", ""]);
      setView("input_otp");

      // Set simulation hint if live bot delivery failed or in dev mode
      if (data.devCode || data.simulation) {
        setSimulationHint({
          code: data.devCode || data.simulation?.code,
          note: data.simulation?.note,
        });
      }

      toast.success(data.message || `Kode verifikasi telah dikirim ke ${channel}.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengirim kode verifikasi.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Submit and verify OTP
  const executeVerifyOtp = async (codeToVerify: string) => {
    if (!codeToVerify || codeToVerify.length < 6) {
      setErrorMessage("Silakan masukkan kode lengkap 6 digit.");
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
          code: codeToVerify.trim(),
          channel: activeChannel,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Kode verifikasi salah atau telah kedaluwarsa.");
      }

      toast.success(data.message || "Verifikasi berhasil! Kunci API terbuka.");
      onSuccess(data.remainingSeconds || 300, data.keys);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Verifikasi gagal.");
      // Select last slot for easy correction
      digitRefs.current[5]?.select();
    } finally {
      setIsVerifying(false);
    }
  };

  // Digit slot typing handler with auto-advance and auto-submit
  const handleDigitChange = (index: number, val: string) => {
    const digits = val.replace(/\D/g, "");

    if (!digits) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    if (digits.length > 1) {
      // Pasted or multiple characters
      const chars = digits.slice(0, 6).split("");
      const next = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        next[i] = chars[i] || "";
      }
      setOtpDigits(next);
      const nextFocus = Math.min(chars.length, 5);
      digitRefs.current[nextFocus]?.focus();
      if (chars.length === 6) {
        executeVerifyOtp(chars.join(""));
      }
      return;
    }

    const next = [...otpDigits];
    next[index] = digits;
    setOtpDigits(next);

    if (index < 5) {
      digitRefs.current[index + 1]?.focus();
    }

    const fullCode = next.join("");
    if (fullCode.length === 6) {
      executeVerifyOtp(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        digitRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      digitRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const chars = pasted.split("");
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < chars.length; i++) {
      next[i] = chars[i];
    }
    setOtpDigits(next);
    const nextFocus = Math.min(chars.length, 5);
    digitRefs.current[nextFocus]?.focus();
    if (chars.length === 6) {
      executeVerifyOtp(chars.join(""));
    }
  };

  // One-click dev simulation autofill
  const handleAutoFillSimulation = (code: string) => {
    const chars = code.slice(0, 6).split("");
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < chars.length; i++) {
      next[i] = chars[i];
    }
    setOtpDigits(next);
    executeVerifyOtp(code);
  };

  // Verify Password Form Handler
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
      onSuccess(data.remainingSeconds || 300, data.keys);
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
      <DialogContent className="sm:max-w-[440px] w-[95vw] p-5 sm:p-6 flex flex-col gap-4 text-left">
        {/* Header Rata Kiri */}
        <DialogHeader className="gap-1.5 text-left items-start">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <ShieldAlert className="size-4.5" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground text-left">
                {view === "input_otp"
                  ? "Masukkan Kode Verifikasi"
                  : view === "input_password"
                  ? "Verifikasi Kata Sandi"
                  : "Verifikasi Keamanan Kunci API"}
              </DialogTitle>
              <span className="text-[11px] text-muted-foreground font-medium">
                Proteksi Akses Data Sensitif
              </span>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed text-left">
            {view === "input_otp"
              ? `Kode verifikasi 6-digit telah dikirimkan ke ${
                  activeChannel === "telegram" ? "Telegram" : "WhatsApp"
                } (${targetDisplay}). Berlaku 5 menit.`
              : view === "input_password"
              ? "Masukkan kata sandi akun Anda untuk membuka akses dan melihat nilai asli Kunci API."
              : "Pilih salah satu kanal terdaftar di bawah untuk menerima kode verifikasi instan."}
          </DialogDescription>
        </DialogHeader>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3 rounded-lg text-xs flex items-start gap-2 bg-destructive/10 text-destructive border border-destructive/20 animate-in fade-in">
            <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Loading Channels Skeleton */}
        {isLoadingOptions ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2.5 text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-xs font-medium">Memeriksa kanal otentikasi akun...</span>
          </div>
        ) : (
          <>
            {/* VIEW 1: PILIH KANAL VERIFIKASI (1-CLICK CARDS) */}
            {view === "select_channel" && (
              <div className="flex flex-col gap-2.5 pt-1">
                {channels.telegram.available && (
                  <button
                    type="button"
                    onClick={() => handleSendOtp("telegram")}
                    disabled={isSendingOtp}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-sky-500/10 hover:border-sky-500/40 text-left transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-colors shrink-0">
                        <Send className="size-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="text-xs font-semibold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400">
                          Kirim Kode ke Telegram
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Tujuan: {channels.telegram.targetDisplay || "Telegram Bot"}
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
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-emerald-500/10 hover:border-emerald-500/40 text-left transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                        <MessageSquare className="size-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="text-xs font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          Kirim Kode ke WhatsApp
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Tujuan: {channels.whatsapp.targetDisplay || "Nomor Terdaftar"}
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

                {/* Password Alternative & Mobile Full-Width Actions */}
                <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setView("input_password");
                    }}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors cursor-pointer text-left py-1 flex items-center gap-1.5"
                  >
                    <KeyRound className="size-3.5" />
                    <span>Gunakan kata sandi akun</span>
                  </button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="w-full sm:w-auto h-9 sm:h-8 text-xs cursor-pointer"
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {/* VIEW 2: SEGMENTED 6-SLOT OTP PIN INPUT */}
            {view === "input_otp" && (
              <div className="flex flex-col gap-4">
                {/* Simulation Hint Banner for Dev / Testing */}
                {simulationHint?.code && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-foreground">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="size-3.5 text-amber-500 shrink-0" />
                      <span className="text-[11px] truncate">
                        Kode Bantuan Dev: <b>{simulationHint.code}</b>
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAutoFillSimulation(simulationHint.code!)}
                      disabled={isVerifying}
                      className="h-6 text-[10px] px-2 font-semibold shrink-0 cursor-pointer"
                    >
                      Isi Otomatis
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Kode Verifikasi (6-Digit)
                    </Label>
                    <button
                      type="button"
                      onClick={() => handleSendOtp(activeChannel)}
                      disabled={isSendingOtp || cooldown > 0}
                      className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline transition-colors cursor-pointer flex items-center gap-1 font-medium"
                    >
                      <RotateCcw className={cn("size-3", isSendingOtp && "animate-spin")} />
                      <span>{cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : "Kirim Ulang"}</span>
                    </button>
                  </div>

                  {/* 6 Segmented PIN Slots */}
                  <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          digitRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={handlePaste}
                        disabled={isVerifying}
                        className={cn(
                          "w-11 sm:w-12 h-12 text-center text-lg font-bold font-mono rounded-xl border bg-background text-foreground transition-all select-all",
                          "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
                          digit
                            ? "border-primary/80 bg-primary/5 shadow-xs"
                            : "border-border/80 hover:border-border"
                        )}
                        aria-label={`Digit ${idx + 1}`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground text-left">
                    Ketik langsung atau tempelkan (*paste*) kode 6-digit. Sistem akan memverifikasi otomatis.
                  </p>
                </div>

                {/* Bottom Action Buttons: Full-Width Vertical on Mobile, Horizontal on Desktop */}
                <div className="flex flex-col sm:flex-row-reverse items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-border/60">
                  <div className="flex flex-col sm:flex-row-reverse items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      onClick={() => executeVerifyOtp(otpDigits.join(""))}
                      disabled={isVerifying || otpDigits.join("").length < 6}
                      className="w-full sm:w-auto h-9 text-xs gap-1.5 cursor-pointer order-1 sm:order-2 font-semibold"
                    >
                      {isVerifying ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Lock className="size-3.5" />
                      )}
                      <span>Buka Kunci Akses</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isVerifying}
                      className="w-full sm:w-auto h-9 text-xs cursor-pointer order-2 sm:order-1"
                    >
                      Batal
                    </Button>
                  </div>

                  {hasAnyChatChannel && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setErrorMessage(null);
                        setOtpDigits(["", "", "", "", "", ""]);
                        setView("select_channel");
                      }}
                      className="w-full sm:w-auto h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer justify-center sm:justify-start"
                    >
                      <ChevronLeft className="size-3.5" />
                      <span>Ganti Metode</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 3: INPUT KATA SANDI AKUN */}
            {view === "input_password" && (
              <form onSubmit={handleVerifyPassword} className="flex flex-col gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="unlock-password" className="text-xs font-semibold text-foreground">
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
                      className="text-xs h-9.5 pr-8 bg-background/60"
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
                  <p className="text-[11px] text-muted-foreground">
                    Gunakan kata sandi login Anda (misal: <code>keluarga123</code>).
                  </p>
                </div>

                {/* Bottom Action Buttons: Full-Width Vertical on Mobile, Horizontal on Desktop */}
                <div className="flex flex-col sm:flex-row-reverse items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-border/60">
                  <div className="flex flex-col sm:flex-row-reverse items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="submit"
                      disabled={isVerifying || !password.trim()}
                      className="w-full sm:w-auto h-9 text-xs gap-1.5 cursor-pointer order-1 sm:order-2 font-semibold"
                    >
                      {isVerifying ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Lock className="size-3.5" />
                      )}
                      <span>Verifikasi Sandi</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isVerifying}
                      className="w-full sm:w-auto h-9 text-xs cursor-pointer order-2 sm:order-1"
                    >
                      Batal
                    </Button>
                  </div>

                  {hasAnyChatChannel && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setErrorMessage(null);
                        setPassword("");
                        setView("select_channel");
                      }}
                      className="w-full sm:w-auto h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer justify-center sm:justify-start"
                    >
                      <ChevronLeft className="size-3.5" />
                      <span>Kirim Kode OTP</span>
                    </Button>
                  )}
                </div>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
