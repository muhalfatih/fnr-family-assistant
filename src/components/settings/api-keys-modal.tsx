"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  KeyRound,
  Bot,
  Send,
  MessageSquare,
  Cloud,
  FileSpreadsheet,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SecretStatusInfo } from "@/lib/security/secret-manager";

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeysModal({ isOpen, onClose }: ApiKeysModalProps) {
  const [activeTab, setActiveTab] = useState("gemini");
  const [keys, setKeys] = useState<Record<string, SecretStatusInfo>>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{
    service: string;
    ok: boolean;
    message: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/keys");
      if (!res.ok) {
        if (res.status === 403) {
          toast.error("Hanya Pengelola Keluarga (Admin / Pasangan) yang dapat mengakses pengaturan ini.");
          onClose();
          return;
        }
        throw new Error("Gagal memuat status kunci API.");
      }
      const data = await res.json();
      if (data.ok && data.keys) {
        setKeys(data.keys);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghubungi server.");
    } finally {
      setIsLoading(false);
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
      setTestFeedback(null);
      setInputValues({});
    }
  }, [isOpen, fetchKeys]);

  const handleInputChange = (keyName: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [keyName]: value }));
  };

  const toggleShowPassword = (keyName: string) => {
    setShowPasswords((prev) => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  const handleSaveTab = async (service: string, keyNames: string[]) => {
    const payloadKeys: Record<string, string> = {};
    let count = 0;

    for (const k of keyNames) {
      if (inputValues[k] !== undefined && inputValues[k].trim() !== "") {
        payloadKeys[k] = inputValues[k].trim();
        count++;
      }
    }

    if (count === 0) {
      toast.info("Tidak ada nilai kunci baru yang dimasukkan.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: payloadKeys }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal menyimpan kunci API.");
      }

      setKeys(data.keys);
      toast.success("Kunci berhasil dienkripsi dan disimpan ke database!");

      // Clear the saved inputs from transient edit state
      setInputValues((prev) => {
        const next = { ...prev };
        for (const k of keyNames) {
          delete next[k];
        }
        return next;
      });
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDbKey = async (keyName: string) => {
    if (!confirm(`Hapus kunci '${keyName}' dari database? Sistem akan kembali ke default fallback .env jika ada.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/settings/keys?key=${encodeURIComponent(keyName)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal menghapus kunci.");
      }
      setKeys(data.keys);
      toast.success(`Kunci '${keyName}' berhasil dihapus dari database.`);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus kunci.");
    }
  };

  const handleTestConnection = async (service: string, primaryKeyName?: string) => {
    setIsTesting(true);
    setTestFeedback(null);

    const customVal = primaryKeyName ? inputValues[primaryKeyName]?.trim() : undefined;

    try {
      const res = await fetch("/api/settings/keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, customValue: customVal }),
      });

      const data = await res.json();
      setTestFeedback({
        service,
        ok: Boolean(data.ok),
        message: data.message || data.error || "Tidak ada respon pengujian.",
      });

      if (data.ok) {
        toast.success(`Uji koneksi ${service.toUpperCase()} berhasil!`);
      } else {
        toast.error(`Uji koneksi gagal: ${data.error || "Kunci tidak valid"}`);
      }
    } catch (err: any) {
      setTestFeedback({
        service,
        ok: false,
        message: err.message || "Gagal melakukan pengujian jaringan.",
      });
      toast.error("Gagal melakukan pengujian koneksi.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopy = (keyName: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast.success("Kunci disalin!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const renderKeyField = (
    keyName: string,
    label: string,
    description: string,
    placeholder: string,
    isSecret = true
  ) => {
    const info = keys[keyName];
    const isDb = info?.source === "database";
    const isEnv = info?.source === "env";
    const hasValue = info?.isConfigured;
    const isVisible = showPasswords[keyName];
    const currentInput = inputValues[keyName] ?? "";

    return (
      <div key={keyName} className="flex flex-col gap-1.5 p-3 rounded-lg border border-border/70 bg-card/60">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Label htmlFor={keyName} className="text-xs font-semibold text-foreground">
              {label}
            </Label>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
              {keyName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isDb && (
              <Badge variant="success" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                <ShieldCheck className="size-3" aria-hidden="true" />
                <span>DB Terenkripsi</span>
              </Badge>
            )}
            {isEnv && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                Dari .env
              </Badge>
            )}
            {!hasValue && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-destructive border-destructive/30 bg-destructive/5">
                Belum Disetel
              </Badge>
            )}

            {isDb && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteDbKey(keyName)}
                className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Hapus dari Database (kembalikan ke fallback env)"
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>

        {/* Existing Masked Hint If Configured */}
        {hasValue && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/50 text-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="text-[11px] text-muted-foreground shrink-0 font-medium">Aktif saat ini:</span>
              <span className="font-mono text-xs text-foreground tracking-tight truncate select-all">
                {info.maskedValue || "••••••••"}
              </span>
            </div>
            {info.maskedValue && !isSecret && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleCopy(keyName, info.maskedValue)}
                className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
                title="Salin nilai"
              >
                {copiedKey === keyName ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
              </Button>
            )}
          </div>
        )}

        {/* New Value Input */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="relative flex-1">
            <Input
              id={keyName}
              type={isSecret && !isVisible ? "password" : "text"}
              placeholder={hasValue ? "Ketik untuk mengganti nilai kunci..." : placeholder}
              value={currentInput}
              onChange={(e) => handleInputChange(keyName, e.target.value)}
              className="text-xs h-9 font-mono pr-8"
            />
            {isSecret && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => toggleShowPassword(keyName)}
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                title={isVisible ? "Sembunyikan" : "Tampilkan"}
              >
                {isVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
        <DialogHeader className="gap-1 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <KeyRound className="size-4" aria-hidden="true" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Kunci API & Kredensial Sistem
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Kelola kunci API pihak ketiga langsung ke database terenkripsi (AES-256-GCM). Sistem akan memprioritaskan database daripada berkas .env.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="text-xs">Memuat kredensial terenkripsi...</span>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setTestFeedback(null); }}>
            <TabsList className="grid grid-cols-5 w-full h-auto p-1 gap-1">
              <TabsTrigger value="gemini" className="text-xs py-1.5 gap-1.5">
                <Bot className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Gemini AI</span>
                <span className="sm:hidden">AI</span>
              </TabsTrigger>
              <TabsTrigger value="telegram" className="text-xs py-1.5 gap-1.5">
                <Send className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Telegram</span>
                <span className="sm:hidden">TG</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="text-xs py-1.5 gap-1.5">
                <MessageSquare className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">WhatsApp</span>
                <span className="sm:hidden">WA</span>
              </TabsTrigger>
              <TabsTrigger value="r2" className="text-xs py-1.5 gap-1.5">
                <Cloud className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Cloudflare R2</span>
                <span className="sm:hidden">R2</span>
              </TabsTrigger>
              <TabsTrigger value="sheets" className="text-xs py-1.5 gap-1.5">
                <FileSpreadsheet className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">G-Sheets</span>
                <span className="sm:hidden">Sheets</span>
              </TabsTrigger>
            </TabsList>

            {/* Test Feedback Banner */}
            {testFeedback && (
              <div
                className={cn(
                  "p-3 rounded-md text-xs flex items-center gap-2 border transition-all mt-3",
                  testFeedback.ok
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                )}
              >
                {testFeedback.ok ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                ) : (
                  <AlertCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <span className="flex-1 leading-snug">{testFeedback.message}</span>
              </div>
            )}

            {/* TAB 1: GEMINI AI */}
            <TabsContent value="gemini" className="flex flex-col gap-3">
              {renderKeyField(
                "GEMINI_API_KEY",
                "Google Gemini API Key",
                "Diperlukan untuk membaca struk kasir via OCR, mencatat pengeluaran otomatis dari chat bot, dan asisten finansial keluarga.",
                "AIzaSy..."
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection("gemini", "GEMINI_API_KEY")}
                  disabled={isTesting || (!keys.GEMINI_API_KEY?.isConfigured && !inputValues.GEMINI_API_KEY)}
                  className="text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {isTesting ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Zap className="size-3.5 text-amber-500" data-icon="inline-start" />}
                  <span>Uji Koneksi Gemini</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveTab("gemini", ["GEMINI_API_KEY"])}
                  disabled={isSaving || !inputValues.GEMINI_API_KEY?.trim()}
                  className="text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Save className="size-3.5" data-icon="inline-start" />}
                  <span>Simpan Kunci</span>
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: TELEGRAM BOT */}
            <TabsContent value="telegram" className="flex flex-col gap-3">
              {renderKeyField(
                "TELEGRAM_BOT_TOKEN",
                "Telegram Bot Token",
                "Token otentikasi bot @fnr_assistant_bot yang diberikan oleh @BotFather.",
                "1234567890:ABCdefGhI..."
              )}
              {renderKeyField(
                "TELEGRAM_WEBHOOK_SECRET",
                "Telegram Webhook Secret (Opsional)",
                "Secret token pengaman untuk memvalidasi permintaan webhook masuk dari Telegram.",
                "Secret acak...",
                true
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection("telegram", "TELEGRAM_BOT_TOKEN")}
                  disabled={isTesting || (!keys.TELEGRAM_BOT_TOKEN?.isConfigured && !inputValues.TELEGRAM_BOT_TOKEN)}
                  className="text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {isTesting ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Zap className="size-3.5 text-blue-500" data-icon="inline-start" />}
                  <span>Uji Bot Telegram</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveTab("telegram", ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"])}
                  disabled={isSaving || (!inputValues.TELEGRAM_BOT_TOKEN?.trim() && !inputValues.TELEGRAM_WEBHOOK_SECRET?.trim())}
                  className="text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Save className="size-3.5" data-icon="inline-start" />}
                  <span>Simpan Kunci</span>
                </Button>
              </div>
            </TabsContent>

            {/* TAB 3: WHATSAPP CLOUD API */}
            <TabsContent value="whatsapp" className="flex flex-col gap-3">
              {renderKeyField(
                "WHATSAPP_ACCESS_TOKEN",
                "WhatsApp Access Token",
                "Meta Graph API Permanent / System User Token untuk mengirim notifikasi dan menerima pesan WA.",
                "EAAG..."
              )}
              {renderKeyField(
                "WHATSAPP_PHONE_NUMBER_ID",
                "WhatsApp Phone Number ID",
                "ID nomor telepon Meta WhatsApp Cloud API.",
                "105938472910293",
                false
              )}
              {renderKeyField(
                "WHATSAPP_VERIFY_TOKEN",
                "WhatsApp Verify Token",
                "Token verifikasi string untuk verifikasi webhook Meta Developer.",
                "fnr_family_wa_secret",
                true
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection("whatsapp", "WHATSAPP_ACCESS_TOKEN")}
                  disabled={isTesting || (!keys.WHATSAPP_ACCESS_TOKEN?.isConfigured && !inputValues.WHATSAPP_ACCESS_TOKEN)}
                  className="text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {isTesting ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Zap className="size-3.5 text-emerald-600" data-icon="inline-start" />}
                  <span>Uji Koneksi WhatsApp</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveTab("whatsapp", ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN"])}
                  disabled={isSaving || (!inputValues.WHATSAPP_ACCESS_TOKEN?.trim() && !inputValues.WHATSAPP_PHONE_NUMBER_ID?.trim() && !inputValues.WHATSAPP_VERIFY_TOKEN?.trim())}
                  className="text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Save className="size-3.5" data-icon="inline-start" />}
                  <span>Simpan Kunci</span>
                </Button>
              </div>
            </TabsContent>

            {/* TAB 4: CLOUDFLARE R2 */}
            <TabsContent value="r2" className="flex flex-col gap-3">
              {renderKeyField(
                "CLOUDFLARE_R2_ACCOUNT_ID",
                "Cloudflare Account ID",
                "ID akun Cloudflare untuk endpoint S3 R2.",
                "a1b2c3d4e5f6...",
                false
              )}
              {renderKeyField(
                "CLOUDFLARE_R2_ACCESS_KEY_ID",
                "R2 Access Key ID",
                "Access Key ID S3 Cloudflare R2.",
                "8f7e6d5c4b3a..."
              )}
              {renderKeyField(
                "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
                "R2 Secret Access Key",
                "Secret Access Key S3 Cloudflare R2.",
                "9a8b7c6d5e4f..."
              )}
              {renderKeyField(
                "CLOUDFLARE_R2_BUCKET_NAME",
                "R2 Bucket Name",
                "Nama bucket tempat menyimpan gambar struk kasir dan dokumen brankas.",
                "fnr-family-receipts",
                false
              )}
              {renderKeyField(
                "CLOUDFLARE_R2_PUBLIC_URL",
                "R2 Public URL (Opsional)",
                "Domain publik CDN jika bucket diatur publik.",
                "https://media.keluarga.com",
                false
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection("r2")}
                  disabled={isTesting}
                  className="text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {isTesting ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Zap className="size-3.5 text-amber-500" data-icon="inline-start" />}
                  <span>Validasi Konfigurasi R2</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    handleSaveTab("r2", [
                      "CLOUDFLARE_R2_ACCOUNT_ID",
                      "CLOUDFLARE_R2_ACCESS_KEY_ID",
                      "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
                      "CLOUDFLARE_R2_BUCKET_NAME",
                      "CLOUDFLARE_R2_PUBLIC_URL",
                    ])
                  }
                  disabled={isSaving}
                  className="text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Save className="size-3.5" data-icon="inline-start" />}
                  <span>Simpan Kunci</span>
                </Button>
              </div>
            </TabsContent>

            {/* TAB 5: GOOGLE SHEETS */}
            <TabsContent value="sheets" className="flex flex-col gap-3">
              {renderKeyField(
                "GOOGLE_SERVICE_ACCOUNT_EMAIL",
                "Service Account Email",
                "Alamat email service account dari Google Cloud Console.",
                "service-account@project.iam.gserviceaccount.com",
                false
              )}
              {renderKeyField(
                "GOOGLE_PRIVATE_KEY",
                "Service Account Private Key",
                "Private key RSA Service Account (format -----BEGIN PRIVATE KEY----- ...).",
                "-----BEGIN PRIVATE KEY-----\n..."
              )}
              {renderKeyField(
                "GOOGLE_SHEETS_SPREADSHEET_ID",
                "Google Sheets Spreadsheet ID",
                "ID spreadsheet untuk sinkronisasi mutasi transaksi realtime.",
                "1BxiMVs0XRX5nZy1QkPA...",
                false
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection("sheets")}
                  disabled={isTesting}
                  className="text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {isTesting ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Zap className="size-3.5 text-emerald-600" data-icon="inline-start" />}
                  <span>Validasi Kredensial Sheets</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    handleSaveTab("sheets", [
                      "GOOGLE_SERVICE_ACCOUNT_EMAIL",
                      "GOOGLE_PRIVATE_KEY",
                      "GOOGLE_SHEETS_SPREADSHEET_ID",
                    ])
                  }
                  disabled={isSaving}
                  className="text-xs h-9 gap-1.5 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="size-3.5 animate-spin" data-icon="inline-start" /> : <Save className="size-3.5" data-icon="inline-start" />}
                  <span>Simpan Kunci</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
