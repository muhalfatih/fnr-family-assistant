"use client";

import React, { useState, Suspense } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Alamat email wajib diisi");
      return;
    }
    if (!password.trim()) {
      setError("Kata sandi wajib diisi");
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

      // Simpan session info di localStorage untuk sinkronisasi antarmuka instan
      if (typeof window !== "undefined") {
        localStorage.setItem("fnr_user", JSON.stringify(data.user));
      }

      toast.success(data.message || "Berhasil masuk!");
      router.replace(redirectTarget);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memproses login");
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="w-full max-w-[390px] z-10 space-y-6">
        {/* Brand & App Identity Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-base tracking-wider shadow-xs mx-auto ring-1 ring-primary/20">
            FR
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              F&R Family Hub
            </h1>
            <p className="text-xs text-muted-foreground pt-0.5">
              Executive Ledger &amp; Family Assistant
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted/60 text-[11px] font-medium text-muted-foreground border border-border/50">
            <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
            <span>Akses Privat Keluarga</span>
          </div>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-border/80 bg-card/95 p-6 sm:p-7 shadow-xs backdrop-blur-xs">
          {/* Form Credentials */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs leading-relaxed border border-destructive/20 animate-in fade-in">
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
        </div>

        {/* Footer Security Notice */}
        <div className="text-center space-y-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[340px] mx-auto">
            Aplikasi internal keluarga F&amp;R. Terenkripsi dan terintegrasi dengan Bot Keuangan Telegram.
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
