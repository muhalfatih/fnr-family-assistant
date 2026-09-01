"use client";

import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/dashboard/navbar";
import { VaultDocument } from "@/app/api/documents/route";
import { VaultSummaryCards } from "@/components/vault/vault-summary-cards";
import { DocumentCard } from "@/components/vault/document-card";
import { AddDocumentModal } from "@/components/vault/add-document-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Send,
  Loader2,
  RefreshCw,
  FolderLock,
  CheckCircle2,
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
      const res = await fetch("/api/documents/remind");
      const data = await res.json();
      if (res.ok) {
        setReminderNotification(data.message || "Pemeriksaan dokumen selesai.");
        mutate();
      } else {
        setReminderNotification(`Gagal: ${data.error}`);
      }
    } catch (err: any) {
      setReminderNotification("Terjadi kesalahan saat memicu pengingat.");
    } finally {
      setIsSendingReminder(false);
    }
  };

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
      // Category filter
      if (selectedCategory !== "all" && doc.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatus !== "all" && doc.status !== selectedStatus) {
        return false;
      }
      // Search query
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

      {/* Main Container */}
      <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <FolderLock className="size-7 text-primary" aria-hidden="true" />
              <h1 className="text-3xl font-bold tracking-tight">
                Brankas Dokumen & Legalitas
              </h1>
              {isValidating && !isLoading && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-normal bg-muted px-2 py-0.5 rounded-full animate-pulse">
                  <RefreshCw className="size-2.5 animate-spin" aria-hidden="true" />
                  <span>Sinkronisasi...</span>
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Penyimpanan arsip digital keluarga, pelacakan masa berlaku berkas, dan notifikasi pengingat otomatis.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              className="gap-1.5 h-9 text-xs"
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
              className="gap-1.5 h-9 text-xs"
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
              className="gap-1.5 h-9 text-xs"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>Tambah Dokumen</span>
            </Button>
          </div>
        </div>

        {/* Reminder Notification Toast/Banner */}
        {reminderNotification && (
          <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/10 text-xs font-medium text-foreground flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="size-4 text-primary shrink-0" aria-hidden="true" />
            <span>{reminderNotification}</span>
          </div>
        )}

        {/* Summary Stat Cards */}
        {isInitialLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[106px] rounded-xl" />
            ))}
          </div>
        ) : (
          <VaultSummaryCards documents={documents} />
        )}

        {/* Filters and Search Bar */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Cari nama atau nomor dokumen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center rounded-lg border p-0.5 bg-muted/40 text-xs">
              {[
                { id: "all", label: "Semua" },
                { id: "active", label: "Aktif" },
                { id: "expiring_soon", label: "Segera Habis" },
                { id: "expired", label: "Kedaluwarsa" },
                { id: "permanent", label: "Permanen" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStatus(st.id)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    selectedStatus === st.id
                      ? "bg-background text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  selectedCategory === c.id
                    ? "bg-primary text-primary-foreground font-medium border-primary"
                    : "bg-background text-muted-foreground hover:text-foreground border-border"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Grid Feed */}
        {isInitialLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[210px] rounded-xl" />
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
              className="mt-4 text-xs gap-1.5"
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
