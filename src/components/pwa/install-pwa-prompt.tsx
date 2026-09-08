"use client";

import * as React from "react";
import { Download, Smartphone, Share, PlusSquare, X, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = React.useState<boolean>(false);
  const [isIOS, setIsIOS] = React.useState<boolean>(false);
  const [showBanner, setShowBanner] = React.useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = React.useState<boolean>(false);

  React.useEffect(() => {
    // 1. Detect if running inside standalone PWA mode
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(standaloneMode);
    if (standaloneMode) return;

    // 2. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(iosDevice);

    // 3. Check dismiss cooldown (7 days)
    const dismissedAt = localStorage.getItem("fnr_pwa_dismissed");
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const isDismissedRecently = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < sevenDaysMs;

    // 4. Capture beforeinstallprompt event (Android / Chromium Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isDismissedRecently) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If iOS and not dismissed recently, show banner with delay
    if (iosDevice && !isDismissedRecently) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    // 5. Listen for manual trigger from header or settings
    const handleManualTrigger = () => {
      if (iosDevice) {
        setShowIosGuide(true);
      } else if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === "accepted") {
            setShowBanner(false);
          }
          setDeferredPrompt(null);
        });
      } else {
        // Fallback for browsers that don't emit prompt or already available
        setShowIosGuide(true);
      }
    };

    window.addEventListener("fnr-open-pwa-prompt", handleManualTrigger);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("fnr-open-pwa-prompt", handleManualTrigger);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowBanner(false);
      setShowIosGuide(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowBanner(false);
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem("fnr_pwa_dismissed", Date.now().toString());
    } catch {}
  };

  // Do not render anything if already installed as standalone
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Floating PWA Install Banner */}
      {showBanner && (
        <aside
          role="region"
          aria-label="Pemberitahuan Pasang Aplikasi"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
        >
          <Card
            variant="solid"
            padding="compact"
            className="border border-border/80 bg-card/95 backdrop-blur-md shadow-lg flex flex-col gap-3 p-3.5 sm:p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Smartphone className="size-5" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground tracking-tight">
                      Pasang F&R Family Hub
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      PWA
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Akses cepat dari layar utama ponsel Anda tanpa bilah browser. Lebih hemat kuota dan responsif.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="size-6 text-muted-foreground hover:text-foreground shrink-0 rounded-md"
                aria-label="Tutup pemberitahuan"
              >
                <X className="size-3.5" />
              </Button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-xs h-7 px-2.5 text-muted-foreground hover:text-foreground"
              >
                Nanti Saja
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleInstallClick}
                className="text-xs h-7 px-3 gap-1.5 font-medium shadow-xs"
              >
                <Download className="size-3.5" />
                <span>Pasang Sekarang</span>
              </Button>
            </div>
          </Card>
        </aside>
      )}

      {/* iOS Safari Step-by-Step Installation Modal */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Smartphone className="size-4" />
              </div>
              <DialogTitle className="text-sm font-bold text-foreground">
                Pasang di Layar Utama iPhone / iPad
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Ikuti 3 langkah mudah berikut untuk menambahkan F&R Family Hub ke beranda perangkat Apple Anda:
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2.5 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <div className="size-6 rounded-md bg-background text-foreground flex items-center justify-center shrink-0 border border-border text-xs font-semibold">
                1
              </div>
              <div className="flex flex-col gap-0.5 text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  Ketuk Tombol Bagikan (Share)
                  <Share className="size-3.5 text-primary inline-block" />
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Buka peramban Safari dan ketuk ikon kotak dengan panah ke atas di bilah menu bawah layar.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <div className="size-6 rounded-md bg-background text-foreground flex items-center justify-center shrink-0 border border-border text-xs font-semibold">
                2
              </div>
              <div className="flex flex-col gap-0.5 text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  Pilih &quot;Tambahkan ke Layar Utama&quot;
                  <PlusSquare className="size-3.5 text-primary inline-block" />
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Gulir ke bawah pada lembar menu opsi dan ketuk menu <strong>&quot;Add to Home Screen&quot;</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5">
              <div className="size-6 rounded-md bg-background text-foreground flex items-center justify-center shrink-0 border border-border text-xs font-semibold">
                3
              </div>
              <div className="flex flex-col gap-0.5 text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  Konfirmasi &quot;Tambah&quot; (Add)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Ketuk tombol <strong>Tambah</strong> di sudut kanan atas. Ikon aplikasi akan langsung muncul di layar utama Anda.
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIosGuide(false)}
              className="text-xs h-8 px-4"
            >
              Mengerti
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Utility helper to trigger the PWA install dialog from any menu or button
 */
export function triggerPwaInstall() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fnr-open-pwa-prompt"));
  }
}
