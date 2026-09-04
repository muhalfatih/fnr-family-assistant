"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [otpCode, setOtpCode] = useState("");
  const [targetDisplay, setTargetDisplay] = useState("");

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
        throw new Error(data.error || "Tautan login tidak valid atau kadaluwarsa.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("fnr_user", JSON.stringify(data.user));
      }
      toast.success(data.message || "Berhasil masuk!");
      router.replace(redirectTarget);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Gagal memproses tautan login.");
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
      setOtpCode("");

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
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengirim kode.");
    } finally {
      setIsLoading(false);
    }
  };

  // Verifikasi Kode OTP 6-Digit
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
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
          code: otpCode.trim(),
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
      setError(err.message || "Kode verifikasi tidak cocok.");
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
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-xs ring-1 ring-primary/20 animate-pulse">
            FR
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Memverifikasi tautan masuk Anda...</span>
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

      {/* Main Centered Card */}
      <div className="w-full max-w-[400px] z-10 space-y-5">
        {/* Brand & App Identity Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base tracking-wider shadow-xs mx-auto ring-1 ring-primary/20">
            FR
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              F&amp;R Family Hub
            </h1>
            <p className="text-xs text-muted-foreground pt-0.5">
              Executive Ledger &amp; Family Assistant
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted/60 text-[11px] font-medium text-muted-foreground border border-border/50">
            <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
            <span>Akses Privat Anggota Keluarga</span>
          </div>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-border/80 bg-card/95 p-6 sm:p-7 shadow-xs backdrop-blur-xs space-y-5">
          {/* Method Switcher Tabs (Only visible on initial input step) */}
          {step === "input" && (
            <div className="grid grid-cols-3 gap-1 p-1 bg-muted/50 rounded-xl border border-border/50 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => {
                  setMethod("whatsapp");
                  setError(null);
                }}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === "whatsapp"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod("telegram");
                  setError(null);
                }}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === "telegram"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Send className="size-3.5 text-blue-500" />
                <span>Telegram</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod("password");
                  setError(null);
                }}
                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === "password"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <KeyRound className="size-3.5 text-amber-500" />
                <span>Sandi</span>
              </button>
            </div>
          )}

          {/* TAB 1 & 2: WHATSAPP / TELEGRAM — STEP 1: INPUT IDENTIFIER */}
          {step === "input" && (method === "whatsapp" || method === "telegram") && (
            <form onSubmit={handleSendOtp} className="space-y-4">
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
                      className="h-10 pl-9 text-xs bg-background/50 border-border/70 focus:border-primary/90"
                      disabled={isLoading}
                      autoFocus
                      required
                    />
                  </div>
                  <p className="text-[10.5px] text-muted-foreground pt-0.5">
                    Kode 6-digit &amp; tautan masuk akan dikirimkan ke nomor WhatsApp Anda.
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
                      className="h-10 pl-9 text-xs bg-background/50 border-border/70 focus:border-primary/90"
                      disabled={isLoading}
                      autoFocus
                      required
                    />
                  </div>
                  <p className="text-[10.5px] text-muted-foreground pt-0.5">
                    Ketik ID Chat angka Anda atau kirim <code>/myid</code> ke bot Telegram keluarga.
                  </p>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs leading-relaxed border border-destructive/20 animate-in fade-in">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Remember Me */}
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
                className="w-full h-10 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl cursor-pointer gap-2 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Mengirimkan kode masuk...</span>
                  </>
                ) : (
                  <>
                    <span>Kirim Kode &amp; Link Masuk</span>
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* TAB 1 & 2: WHATSAPP / TELEGRAM — STEP 2: VERIFY OTP CODE */}
          {step === "verify" && (method === "whatsapp" || method === "telegram") && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep("input");
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ArrowLeft className="size-3" />
                  <span>Ganti nomor/ID</span>
                </button>
                <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                  {method === "whatsapp" ? "WhatsApp" : "Telegram"}
                </span>
              </div>

              <div className="text-center space-y-1 py-1">
                <p className="text-xs font-medium text-foreground">
                  Masukkan 6-Digit Kode Verifikasi
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Telah dikirim ke <strong className="font-semibold text-foreground">{targetDisplay}</strong>
                </p>
              </div>

              {/* Simulation/Dev Code Hint Alert */}
              {simulationHint && simulationHint.code && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11.5px] text-amber-700 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Sparkles className="size-3.5 text-amber-500" />
                    <span>Mode Pengujian / Simulasi</span>
                  </div>
                  <p className="text-[11px] leading-tight">
                    Kode verifikasi Anda: <code className="font-bold text-xs bg-amber-500/20 px-1.5 py-0.5 rounded">{simulationHint.code}</code>
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

              {/* Centered OTP Code Input */}
              <div className="space-y-1.5">
                <Input
                  id="otpInput"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "");
                    setOtpCode(clean);
                    if (error) setError(null);
                  }}
                  placeholder="••••••"
                  className="h-12 text-center text-lg font-bold font-mono tracking-[0.35em] bg-background/50 border-border/70 focus:border-primary/90 max-w-[220px] mx-auto"
                  autoFocus
                  required
                />
              </div>

              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs leading-relaxed border border-destructive/20 animate-in fade-in">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Resend Cooldown Button */}
              <div className="text-center pt-1">
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
                disabled={isLoading || otpCode.length < 6}
                className="w-full h-10 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl cursor-pointer gap-2 transition-all"
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

          {/* TAB 3: EMAIL & SANDI (FALLBACK) */}
          {step === "input" && method === "password" && (
            <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
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
                    className="h-10 pl-9 text-xs bg-background/50 border-border/70 focus:border-primary/90"
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
                    className="h-10 pl-9 pr-9 text-xs bg-background/50 border-border/70 focus:border-primary/90"
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
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !email.trim() || !password.trim()}
                className="w-full h-10 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl cursor-pointer gap-2 transition-all"
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
        </div>

        {/* Footer Security Notice */}
        <div className="text-center space-y-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[340px] mx-auto">
            Aplikasi internal keluarga F&amp;R. Terenkripsi dan terintegrasi dengan Bot Keuangan Telegram &amp; WhatsApp.
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
          <div className="flex flex-col items-center gap-3">
            <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-xs ring-1 ring-primary/20">
              FR
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
