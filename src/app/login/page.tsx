"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Send,
  KeyRound,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

type LoginMethod = "whatsapp" | "telegram" | "password";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("from") || "/";
  const magicTokenParam = searchParams.get("token");

  // Tab & Step states
  const [method, setMethod] = useState<LoginMethod>("whatsapp");
  const [step, setStep] = useState<"input" | "verify">("input");

  // Inputs
  const [phone, setPhone] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [targetDisplay, setTargetDisplay] = useState("");

  // 6-digit OTP array state
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Email & Password inputs (Fallback tab)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingMagic, setIsVerifyingMagic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [simulationHint, setSimulationHint] = useState<{
    code?: string;
    magicLink?: string;
    note?: string;
  } | null>(null);

  // 1. Tangani Magic Link otomatis jika URL memuat param ?token=...
  useEffect(() => {
    if (magicTokenParam) {
      handleVerifyMagicToken(magicTokenParam);
    }
  }, [magicTokenParam]);

  // 2. Timer hitung mundur untuk kirim ulang kode (60 detik)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerifyMagicToken = async (token: string) => {
    setIsVerifyingMagic(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rememberMe: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Tautan masuk ini sudah kadaluwarsa atau telah digunakan. Silakan minta kode baru.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("fnr_user", JSON.stringify(data.user));
      }
      toast.success(data.message || "Berhasil masuk!");
      router.replace(redirectTarget);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal memproses tautan masuk. Silakan minta kode baru.");
    } finally {
      setIsVerifyingMagic(false);
    }
  };

  // Kirim Kode OTP & Magic Link (WhatsApp / Telegram)
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const identifier = method === "whatsapp" ? phone : telegramId;
    if (!identifier.trim()) {
      setError(
        method === "whatsapp"
          ? "Nomor WhatsApp wajib diisi."
          : "ID Chat atau Username Telegram wajib diisi."
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: method,
          identifier: identifier.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim kode verifikasi.");
      }

      setTargetDisplay(data.targetDisplay || identifier);
      setResendCooldown(data.resendCooldown || 60);
      setStep("verify");
      setOtpDigits(["", "", "", "", "", ""]);

      // Jika dalam mode simulasi / testing lokal, sediakan hint transparan
      if (data.simulation || data.devCode) {
        setSimulationHint({
          code: data.devCode || data.simulation?.code,
          magicLink: data.devMagicLink || data.simulation?.magicLink,
          note: data.simulation?.note,
        });
      } else {
        setSimulationHint(null);
      }

      toast.success(data.message || "Kode verifikasi telah dikirim!");

      // Focus ke kotak digit pertama
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengirim kode.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler interaksi input OTP 6-slot individual
  const handleDigitChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    if (error) setError(null);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);
    if (error) setError(null);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const currentFullCode = otpDigits.join("");

  // Verifikasi Kode OTP 6-Digit
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentFullCode.length < 6) {
      setError("Masukkan 6 digit kode verifikasi secara lengkap.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const identifier = method === "whatsapp" ? phone : telegramId;

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: method,
          identifier: identifier.trim(),
          code: currentFullCode,
          rememberMe,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Kode verifikasi salah.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("fnr_user", JSON.stringify(data.user));
      }

      toast.success(data.message || "Berhasil masuk!");
      router.replace(redirectTarget);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Kode verifikasi 6-digit tidak cocok. Silakan periksa kembali pesan WhatsApp/Telegram Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  // Login Fallback via Email & Sandi
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Alamat email wajib diisi.");
      return;
    }
    if (!password.trim()) {
      setError("Kata sandi wajib diisi.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          rememberMe,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal masuk. Periksa kembali email dan sandi Anda.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("fnr_user", JSON.stringify(data.user));
      }

      toast.success(data.message || "Berhasil masuk!");
      router.replace(redirectTarget);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses login.");
    } finally {
      setIsLoading(false);
    }
  };

  // State tampilan saat verifikasi Magic Link otomatis
  if (isVerifyingMagic) {
    return (
      <main className="min-h-screen w-full bg-background flex flex-col justify-center items-center p-4 sm:p-6 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs ring-1 ring-primary/20 animate-pulse">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Memverifikasi tautan masuk instan...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-background flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Subtle flat geometric grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Main Centered Card Container (Matching EditBudgetItemModal layout & typography) */}
      <div className="sm:max-w-[420px] w-[95vw] rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4 z-10 backdrop-blur-xs">
        {/* Integrated Card Header */}
        <div className="space-y-1 pb-3.5 border-b border-border/40 text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-4" strokeWidth={2.2} aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-semibold tracking-tight text-foreground">
                    F&amp;R Family Hub
                  </h1>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    v2.0
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Buku Kas &amp; Asisten Finansial Keluarga
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md shrink-0">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Privat</span>
            </span>
          </div>
        </div>

        {/* Method Switcher Tabs (shadcn Tabs component) */}
        {step === "input" && (
          <Tabs
            value={method}
            onValueChange={(val) => {
              setMethod(val as LoginMethod);
              setError(null);
            }}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 w-full h-9 bg-muted/70 p-1 rounded-lg border border-border/40">
              <TabsTrigger
                value="whatsapp"
                className="text-xs font-medium gap-1.5 h-7 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
              >
                <Smartphone className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp</span>
              </TabsTrigger>
              <TabsTrigger
                value="telegram"
                className="text-xs font-medium gap-1.5 h-7 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
              >
                <Send className="size-3.5 text-blue-500" />
                <span>Telegram</span>
              </TabsTrigger>
              <TabsTrigger
                value="password"
                className="text-xs font-medium gap-1.5 h-7 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all cursor-pointer"
              >
                <KeyRound className="size-3.5 text-amber-500" />
                <span>Kata Sandi</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* STEP 1: WHATSAPP / TELEGRAM INPUT */}
        {step === "input" && (method === "whatsapp" || method === "telegram") && (
          <form onSubmit={handleSendOtp} className="space-y-3.5 pt-1">
            {method === "whatsapp" ? (
              <div className="space-y-1.5">
                <Label htmlFor="whatsappInput" className="text-xs font-medium text-foreground">
                  Nomor WhatsApp Terdaftar
                </Label>
                <div className="relative flex items-center">
                  <Smartphone className="absolute left-3 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="whatsappInput"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="0812-3456-7890 atau +62812..."
                    className="h-9 pl-9 text-xs bg-background/50 border-border/60 focus:border-primary/80"
                    disabled={isLoading}
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Kode 6-digit dan tautan masuk instan akan dikirimkan ke nomor WhatsApp Anda.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="telegramInput" className="text-xs font-medium text-foreground">
                  ID Chat atau Username Telegram
                </Label>
                <div className="relative flex items-center">
                  <Send className="absolute left-3 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="telegramInput"
                    type="text"
                    value={telegramId}
                    onChange={(e) => {
                      setTelegramId(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Contoh: 123456789 atau @fatih"
                    className="h-9 pl-9 text-xs bg-background/50 border-border/60 focus:border-primary/80"
                    disabled={isLoading}
                    autoFocus
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Ketik ID Chat angka Anda atau kirim <code>/myid</code> ke bot Telegram keluarga.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs leading-relaxed border border-destructive/20 animate-in fade-in">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">Ingat sesi di perangkat ini</span>
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || (method === "whatsapp" ? !phone.trim() : !telegramId.trim())}
              className="w-full h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs cursor-pointer gap-2 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Mengirimkan kode masuk...</span>
                </>
              ) : (
                <>
                  <span>Kirim Kode &amp; Tautan Masuk</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* STEP 2: VERIFY 6-DIGIT OTP INDIVIDUAL SLOTS */}
        {step === "verify" && (method === "whatsapp" || method === "telegram") && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep("input");
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Ganti nomor atau ID</span>
              </button>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted/70 text-muted-foreground border border-border/50">
                {method === "whatsapp" ? "WhatsApp" : "Telegram"}
              </span>
            </div>

            <div className="text-center space-y-0.5 py-0.5">
              <p className="text-xs font-semibold text-foreground">
                Masukkan 6-Digit Kode Masuk
              </p>
              <p className="text-[11px] text-muted-foreground">
                Telah dikirim ke <strong className="font-semibold text-foreground">{targetDisplay}</strong>
              </p>
            </div>

            {/* Simulation/Dev Code Hint Alert */}
            {simulationHint && simulationHint.code && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Mode Pengujian / Simulasi</span>
                </div>
                <p className="text-[11px] leading-tight">
                  Kode verifikasi Anda:{" "}
                  <code className="font-bold text-xs bg-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                    {simulationHint.code}
                  </code>
                </p>
                {simulationHint.magicLink && (
                  <a
                    href={simulationHint.magicLink}
                    className="block text-[10.5px] text-primary underline truncate pt-0.5 hover:opacity-80"
                  >
                    Buka tautan instan (Magic Link)
                  </a>
                )}
              </div>
            )}

            {/* 6-Slot Kotak Input OTP (Shadcn Native Style) */}
            <div className="flex items-center justify-center gap-2 py-1">
              {Array.from({ length: 6 }).map((_, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpInputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={otpDigits[index] || ""}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(index, e)}
                  onPaste={handleDigitPaste}
                  className="size-10 rounded-lg border border-border/80 bg-background/50 text-center font-mono text-base font-bold text-foreground tabular-nums shadow-xs transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                  aria-label={`Digit ke ${index + 1}`}
                />
              ))}
            </div>

            {/* Hidden backup input for accessibility/tests */}
            <input
              id="otpInput"
              type="hidden"
              value={currentFullCode}
              readOnly
            />

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs leading-relaxed border border-destructive/20 animate-in fade-in">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Resend Cooldown Button */}
            <div className="text-center pt-0.5">
              {resendCooldown > 0 ? (
                <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                  <RefreshCw className="size-3 animate-spin text-muted-foreground" />
                  <span>Kirim ulang kode dalam {resendCooldown} detik</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={isLoading}
                  className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                >
                  Kirim ulang kode verifikasi
                </button>
              )}
            </div>

            {/* Verify & Enter Button */}
            <Button
              type="submit"
              disabled={isLoading || currentFullCode.length < 6}
              className="w-full h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs cursor-pointer gap-2 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Memverifikasi kode...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Verifikasi &amp; Masuk</span>
                </>
              )}
            </Button>
          </form>
        )}

        {/* STEP 1: FALLBACK EMAIL & SANDI TAB */}
        {step === "input" && method === "password" && (
          <form onSubmit={handleEmailPasswordLogin} className="space-y-3.5 pt-1">
            {/* Email Input */}
            <div className="space-y-1.5">
              <Label htmlFor="loginEmailInput" className="text-xs font-medium text-foreground">
                Email Akun Keluarga
              </Label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="loginEmailInput"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="contoh@keluarga.hub"
                  className="h-9 pl-9 text-xs bg-background/50 border-border/60 focus:border-primary/80"
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <Label htmlFor="loginPasswordInput" className="text-xs font-medium text-foreground">
                Kata Sandi
              </Label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  id="loginPasswordInput"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Masukkan kata sandi"
                  className="h-9 pl-9 pr-9 text-xs bg-background/50 border-border/60 focus:border-primary/80"
                  disabled={isLoading}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 size-6 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer rounded-md transition-colors"
                  title={showPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                  aria-label={showPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                >
                  {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-3.5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer accent-primary"
                />
                <span className="text-xs text-muted-foreground">Ingat sesi di perangkat ini</span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs leading-relaxed border border-destructive/20 animate-in fade-in">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full h-9 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs cursor-pointer gap-2 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Memverifikasi kredensial...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Footer Security Notice */}
        <div className="text-center pt-2 space-y-1.5 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Aplikasi internal keluarga F&amp;R. Terenkripsi dan terintegrasi dengan Bot Telegram &amp; WhatsApp.
          </p>
          <div className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Status Layanan: Aktif &amp; Terhubung</span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen w-full bg-background flex flex-col justify-center items-center p-4 sm:p-6 select-none">
          <div className="sm:max-w-[420px] w-[95vw] rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col items-center gap-3">
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs ring-1 ring-emerald-500/20">
              <ShieldCheck className="size-4" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              <span>Memuat halaman login...</span>
            </div>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
