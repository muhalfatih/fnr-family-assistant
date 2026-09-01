"use client";

import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/dashboard/navbar";
import { VaultDocument } from "@/app/api/documents/route";
import { DocumentCard } from "@/components/vault/document-card";
import { AddDocumentModal } from "@/components/vault/add-document-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Send,
  Loader2,
  RefreshCw,
  FolderLock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useDocuments } from "@/lib/hooks/use-family-data";

export default function VaultPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<VaultDocument | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderNotification, setReminderNotification] = useState<string | null>(null);

  // SWR Caching & Real-time Auto-sync Hook
  const { documents, isLoading, isValidating, mutate } = useDocuments();

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus arsip dokumen ini?")) return;
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        mutate();
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  const handleEditDocument = (doc: VaultDocument) => {
    setDocumentToEdit(doc);
    setIsAddModalOpen(true);
  };

  const handleTriggerReminder = async () => {
    setIsSendingReminder(true);
    setReminderNotification(null);
    try {
      const res = await fetch("/api/documents/remind", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setReminderNotification(data.message || "Pemeriksaan dokumen selesai.");
        mutate();
      } else {
        setReminderNotification(`Gagal: ${data.error || "Terjadi kesalahan pada server."}`);
      }
    } catch (err: any) {
      setReminderNotification("Terjadi kesalahan saat memicu pengingat.");
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Status counts for integrated filters
  const counts = useMemo(() => {
    const total = documents.length;
    const expiringSoon = documents.filter((d) => d.status === "expiring_soon").length;
    const expired = documents.filter((d) => d.status === "expired").length;
    const active = documents.filter((d) => d.status === "active").length;
    const permanent = documents.filter((d) => d.status === "permanent").length;
    return { total, expiringSoon, expired, active, permanent };
  }, [documents]);

  // Categories list
  const categories = [
    { id: "all", label: "Semua Kategori" },
    { id: "identity", label: "Identitas" },
    { id: "vehicle", label: "Kendaraan" },
    { id: "property", label: "Properti" },
    { id: "insurance", label: "Asuransi" },
    { id: "health", label: "Kesehatan" },
    { id: "tax", label: "Pajak" },
    { id: "other", label: "Lain-lain" },
  ];

  // Filter and search logic
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (selectedCategory !== "all" && doc.category !== selectedCategory) {
        return false;
      }
      if (selectedStatus !== "all" && doc.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchNum = doc.document_number ? doc.document_number.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchNum) return false;
      }
      return true;
    });
  }, [documents, selectedCategory, selectedStatus, searchQuery]);

  const isInitialLoading = isLoading && documents.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navbar */}
      <Navbar familyName="Keluarga F&R" />

      {/* Main Container with Standard Shadcn Dashboard Layout */}
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <FolderLock className="size-7 text-primary shrink-0" aria-hidden="true" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                Brankas Dokumen & Legalitas
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Arsip digital keluarga, pelacakan masa berlaku berkas, dan notifikasi pengingat otomatis ke Telegram.
              </p>
              {isValidating && !isLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-normal bg-muted px-2 py-0.5 rounded-full animate-pulse shrink-0">
                  <RefreshCw className="size-2.5 animate-spin" aria-hidden="true" />
                  <span>Sinkronisasi</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              className="gap-1.5 h-9 text-xs px-3 rounded-md"
              title="Segarkan data dokumen"
            >
              <RefreshCw className={`size-3.5 ${isValidating ? "animate-spin" : ""}`} aria-hidden="true" />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerReminder}
              disabled={isSendingReminder}
              className="gap-1.5 h-9 text-xs px-3 rounded-md"
              title="Picu scanner pengingat dokumen kedaluwarsa ke bot Telegram"
            >
              {isSendingReminder ? (
                <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
              ) : (
                <Send className="size-3.5 text-blue-500" aria-hidden="true" />
              )}
              <span>Kirim Pengingat Telegram</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setDocumentToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="gap-1.5 h-9 text-xs px-3 rounded-md"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>Tambah Dokumen</span>
            </Button>
          </div>
        </div>

        {/* Reminder Notification Toast/Banner */}
        {reminderNotification && (
          <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/10 text-xs font-medium text-foreground flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="size-4 text-primary shrink-0" aria-hidden="true" />
            <span>{reminderNotification}</span>
          </div>
        )}

        {/* Integrated Status Alert Bars if Expiring or Expired */}
        {(counts.expiringSoon > 0 || counts.expired > 0) && (
          <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl border bg-muted/30 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-amber-500" aria-hidden="true" />
              <span>Perhatian Dokumen:</span>
            </span>
            {counts.expired > 0 && (
              <Badge variant="destructive" className="gap-1 text-[11px]">
                <XCircle className="size-3" aria-hidden="true" />
                <span>{counts.expired} Berkas Sudah Kedaluwarsa</span>
              </Badge>
            )}
            {counts.expiringSoon > 0 && (
              <Badge variant="secondary" className="gap-1 text-[11px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                <AlertTriangle className="size-3" aria-hidden="true" />
                <span>{counts.expiringSoon} Berkas Segera Habis (&le; 30 Hari)</span>
              </Badge>
            )}
          </div>
        )}

        {/* Filters and Search Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search + Category Dropdown */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Cari nama atau nomor dokumen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 rounded-md"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[145px] h-9 text-xs shrink-0 rounded-md">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter Tabs with Integrated Badge Counters */}
          <div className="flex items-center rounded-md border p-0.5 bg-muted/40 text-xs gap-1 overflow-x-auto">
            {[
              { id: "all", label: "Semua", count: counts.total },
              { id: "expiring_soon", label: "Segera Habis", count: counts.expiringSoon, alert: counts.expiringSoon > 0 },
              { id: "expired", label: "Kedaluwarsa", count: counts.expired, danger: counts.expired > 0 },
              { id: "active", label: "Aktif", count: counts.active },
              { id: "permanent", label: "Permanen", count: counts.permanent },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  selectedStatus === st.id
                    ? "bg-background text-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{st.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-mono ${
                  st.danger
                    ? "bg-destructive text-destructive-foreground"
                    : st.alert
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {st.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Documents Grid Feed */}
        {isInitialLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[180px] rounded-xl" />
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-16 px-4 text-center rounded-xl border border-dashed text-muted-foreground">
            <FolderLock className="size-10 mx-auto mb-3 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">Tidak Ada Dokumen yang Sesuai</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">
              Belum ada dokumen yang terdaftar pada kategori atau status ini. Klik "Tambah Dokumen" untuk mengarsipkan berkas keluarga Anda.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedStatus("all");
                setSearchQuery("");
                setIsAddModalOpen(true);
              }}
              className="mt-4 text-xs gap-1.5 h-9"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              <span>Tambah Dokumen Sekarang</span>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onEdit={handleEditDocument}
                onDelete={handleDeleteDocument}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal Tambah / Edit Dokumen */}
      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setDocumentToEdit(null);
        }}
        onSuccess={() => mutate()}
        documentToEdit={documentToEdit}
      />
    </div>
  );
}
