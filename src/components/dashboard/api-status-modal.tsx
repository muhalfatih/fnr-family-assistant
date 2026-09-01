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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Sparkles,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  ExternalLink,
} from "lucide-react";
import { ServiceDiagnosticResult } from "@/app/api/diagnostics/route";

interface ApiStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiStatusModal({ isOpen, onClose }: ApiStatusModalProps) {
  const [results, setResults] = useState<ServiceDiagnosticResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<string>("loading");
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/diagnostics", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setResults(data.services || []);
        setOverallStatus(data.overallStatus || "unknown");
        setLastChecked(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } catch (err) {
      console.error("Gagal mengambil data diagnostik API:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen]);

  const getServiceIcon = (id: string) => {
    switch (id) {
      case "gemini":
        return <Sparkles className="size-4 text-purple-600" aria-hidden="true" />;
      case "telegram":
        return <Bot className="size-4 text-blue-600" aria-hidden="true" />;
      case "supabase":
        return <Database className="size-4 text-emerald-600" aria-hidden="true" />;
      case "google_cloud":
        return <Cloud className="size-4 text-amber-600" aria-hidden="true" />;
      default:
        return <Cloud className="size-4 text-slate-500" aria-hidden="true" />;
    }
  };

  const getStatusBadge = (status: string, latency?: number) => {
    switch (status) {
      case "connected":
        return (
          <div className="flex items-center gap-1.5 shrink-0">
            {latency && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 tabular-nums">
                <Clock className="size-3" aria-hidden="true" />
                {latency}ms
              </span>
            )}
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-xs gap-1 font-normal">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              <span>Terhubung</span>
            </Badge>
          </div>
        );
      case "missing_config":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs gap-1 font-normal">
            <AlertTriangle className="size-3" aria-hidden="true" />
            <span>Belum Diatur</span>
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="text-xs gap-1 font-normal">
            <XCircle className="size-3" aria-hidden="true" />
            <span>Gagal</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">Memeriksa...</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2">
              <span>Status Koneksi API & Layanan</span>
            </DialogTitle>
          </div>
          <DialogDescription>
            Pemeriksaan real-time integrasi kecerdasan buatan, bot pesan, database, dan sinkronisasi cloud.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Header Summary Bar */}
          <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Status Keseluruhan:</span>
              {overallStatus === "healthy" ? (
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  ● Semua Layanan Aktif
                </span>
              ) : overallStatus === "needs_config" ? (
                <span className="font-semibold text-amber-600 flex items-center gap-1">
                  ● Membutuhkan Konfigurasi API
                </span>
              ) : (
                <span className="font-semibold text-rose-600 flex items-center gap-1">
                  ● Beberapa Layanan Terkendala
                </span>
              )}
            </div>
            {lastChecked && (
              <span className="text-muted-foreground text-[11px]">
                Dicek pukul {lastChecked}
              </span>
            )}
          </div>

          {/* Service Cards List */}
          <div className="grid gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {isLoading && results.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" aria-hidden="true" />
                <span>Menghubungi endpoint API...</span>
              </div>
            ) : (
              results.map((service) => (
                <div
                  key={service.id}
                  className="p-3.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background border">
                        {getServiceIcon(service.id)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate text-foreground">
                          {service.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {service.category}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(service.status, service.latencyMs)}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pl-9">
                    {service.message}
                  </p>

                  {/* Additional Metadata Details */}
                  {service.details && Object.keys(service.details).length > 0 && (
                    <div className="ml-9 mt-0.5 p-2 rounded bg-muted/40 text-[11px] font-mono text-muted-foreground flex flex-col gap-0.5">
                      {Object.entries(service.details).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-foreground/70">{key}:</span>
                          <span className="truncate max-w-[220px] text-foreground font-semibold">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchDiagnostics}
            disabled={isLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>{isLoading ? "Memeriksa..." : "Uji Ulang Koneksi"}</span>
          </Button>

          <Button type="button" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
